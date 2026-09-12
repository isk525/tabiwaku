//+------------------------------------------------------------------+
//|                                Scalping_USDJPY_Special.mq4       |
//+------------------------------------------------------------------+
#property copyright "Custom Indicator"
#property link      ""
#property version   "1.00"
#property strict
#property indicator_chart_window

#property indicator_buffers 6
#property indicator_color1 clrLime       // 逆張り買い
#property indicator_color2 clrRed        // 逆張り売り
#property indicator_color3 clrDeepSkyBlue // 順張り買い
#property indicator_color4 clrOrange      // 順張り売り
#property indicator_color5 clrGray        // 買い危険
#property indicator_color6 clrDarkGray    // 売り危険

#property indicator_width1 2
#property indicator_width2 2
#property indicator_width3 2
#property indicator_width4 2
#property indicator_width5 1
#property indicator_width6 1

//--- パラメータ設定（USDJPY最適化）
input group "=== レンジ・トレンド判定 (ADX) ==="
input int             ADXPeriod               = 14;        
input double          ADXRangeLevel           = 18.0;      // USDJPY用に少し下げる
input bool            FilterTrendInRange      = true;      

input group "=== 逆張り急変動回避 ==="
input bool            UseBigCandleFilter      = true;      
input double          BigCandleATRMultiplier  = 2.2;       
input int             ATRPeriod               = 14;        
input bool            UseReversalConfirmFilter= true;      
input double          MinWickConfirmRatio     = 0.2;       

input group "=== 天井・底圏ダマシ回避 ==="
input bool            UseHighLowBreakFilter   = true;      
input int             HighLowLookbackBars     = 5;         
input bool            UseWickFilter           = true;      
input double          MaxWickRatio            = 0.45;      

input group "=== 順張りダマシ・逆行回避 ==="
input bool            UseCounterMomentumFilter= true;      
input double          CounterMomentumATRMult  = 1.1;       
input bool            UseDivergenceFilter     = true;      
input bool            UseSRLineFilter         = true;      
input int             SRLookbackBars          = 15;        
input double          SRBufferPips            = 0.6;       // USDJPYの狭いレンジ用に調整
input bool            UseEMADistanceFilter    = true;      
input double          MaxEMADistancePips      = 5.0;       // 高値掴み防止を厳格化

input group "=== 上位足トレンドフィルター ==="
input ENUM_TIMEFRAMES HigherTimeframe        = PERIOD_M5; 
input int             HigherEmaPeriod          = 20;        
input bool            UseReversalTrendFilter   = false;     

input group "=== 移動平均線 / ボリンジャー / RSI ==="
input int             ShortEmaPeriod          = 20;        
input int             LongEmaPeriod           = 50;        
input int             BBDeviation             = 2;         
input int             BBPeriod                = 20;        
input int             RSIShortPeriod          = 9;         
input int             RSILongPeriod           = 14;        
input double          RSIUpperLevel           = 70.0;      
input double          RSILowerLevel           = 30.0;      
input double          RSITrendBuyLevel         = 55.0;      
input double          RSITrendSellLevel        = 45.0;      

input group "=== アラート設定 ==="
input bool            UseAlert                = true;      

//--- バッファ
double ReversalBuyBuffer[];
double ReversalSellBuffer[];
double TrendBuyBuffer[];
double TrendSellBuffer[];
double DangerBuyBuffer[];
double DangerSellBuffer[];

int OnInit()
{
   SetIndexBuffer(0, ReversalBuyBuffer);  SetIndexStyle(0, DRAW_ARROW); SetIndexArrow(0, 233);
   SetIndexBuffer(1, ReversalSellBuffer); SetIndexStyle(1, DRAW_ARROW); SetIndexArrow(1, 234);
   SetIndexBuffer(2, TrendBuyBuffer);     SetIndexStyle(2, DRAW_ARROW); SetIndexArrow(2, 233);
   SetIndexBuffer(3, TrendSellBuffer);    SetIndexStyle(3, DRAW_ARROW); SetIndexArrow(3, 234);
   SetIndexBuffer(4, DangerBuyBuffer);   SetIndexStyle(4, DRAW_ARROW); SetIndexArrow(4, 201);
   SetIndexBuffer(5, DangerSellBuffer);  SetIndexStyle(5, DRAW_ARROW); SetIndexArrow(5, 201);

   IndicatorShortName("USDJPY Special Scalping v1.0");
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason) { ObjectDelete(0, "MarketStateLabelUSDJPY"); }

int OnCalculate(const int rates_total, const int prev_calculated, const datetime &time[],
                const double &open[], const double &high[], const double &low[], const double &close[],
                const long &tick_volume[], const long &volume[], const int &spread[])
{
   int limit = rates_total - prev_calculated;
   if(limit > rates_total - 100) limit = rates_total - 100;

   if(rates_total > 0)
   {
      double currentADX = iADX(Symbol(), PERIOD_CURRENT, ADXPeriod, PRICE_CLOSE, MODE_MAIN, 0);
      bool isRange = (currentADX < ADXRangeLevel);
      string stateText = StringFormat("【USD/JPY】%s (ADX: %.1f)", isRange ? "レンジ相場" : "トレンド相場", currentADX);
      
      if(ObjectFind(0, "MarketStateLabelUSDJPY") < 0)
      {
         ObjectCreate(0, "MarketStateLabelUSDJPY", OBJ_LABEL, 0, 0, 0);
         ObjectSetInteger(0, "MarketStateLabelUSDJPY", OBJPROP_CORNER, CORNER_LEFT_UPPER);
         ObjectSetInteger(0, "MarketStateLabelUSDJPY", OBJPROP_XDISTANCE, 10);
         ObjectSetInteger(0, "MarketStateLabelUSDJPY", OBJPROP_YDISTANCE, 15);
         ObjectSetInteger(0, "MarketStateLabelUSDJPY", OBJPROP_FONTSIZE, 10);
      }
      ObjectSetString(0, "MarketStateLabelUSDJPY", OBJPROP_TEXT, stateText);
      ObjectSetInteger(0, "MarketStateLabelUSDJPY", OBJPROP_COLOR, isRange ? clrYellow : clrDeepSkyBlue);
   }

   double pipsUnit = (Digits == 3 || Digits == 5) ? Point * 10 : Point;

   for(int i = limit - 1; i >= 0; i--)
   {
      ReversalBuyBuffer[i]  = EMPTY_VALUE; ReversalSellBuffer[i] = EMPTY_VALUE;
      TrendBuyBuffer[i]     = EMPTY_VALUE; TrendSellBuffer[i]    = EMPTY_VALUE;
      DangerBuyBuffer[i]    = EMPTY_VALUE; DangerSellBuffer[i]   = EMPTY_VALUE;

      double htfEMA   = iMA(Symbol(), HigherTimeframe, HigherEmaPeriod, 0, MODE_EMA, PRICE_CLOSE, iBarShift(Symbol(), HigherTimeframe, time[i]));
      double emaShort = iMA(Symbol(), PERIOD_CURRENT, ShortEmaPeriod, 0, MODE_EMA, PRICE_CLOSE, i);
      double emaLong  = iMA(Symbol(), PERIOD_CURRENT, LongEmaPeriod, 0, MODE_EMA, PRICE_CLOSE, i);

      double bbUpper2 = iBands(Symbol(), PERIOD_CURRENT, BBPeriod, BBDeviation, 0, PRICE_CLOSE, MODE_UPPER, i);
      double bbLower2 = iBands(Symbol(), PERIOD_CURRENT, BBPeriod, BBDeviation, 0, PRICE_CLOSE, MODE_LOWER, i);
      double bbUpper1 = iBands(Symbol(), PERIOD_CURRENT, BBPeriod, 1, 0, PRICE_CLOSE, MODE_UPPER, i);
      double bbLower1 = iBands(Symbol(), PERIOD_CURRENT, BBPeriod, 1, 0, PRICE_CLOSE, MODE_LOWER, i);

      double rsiShort = iRSI(Symbol(), PERIOD_CURRENT, RSIShortPeriod, PRICE_CLOSE, i);
      double rsiLong  = iRSI(Symbol(), PERIOD_CURRENT, RSILongPeriod, PRICE_CLOSE, i);
      double adxValue = iADX(Symbol(), PERIOD_CURRENT, ADXPeriod, PRICE_CLOSE, MODE_MAIN, i);
      bool isRangeBar = (adxValue < ADXRangeLevel);

      bool prevRevBuy   = (i + 1 < rates_total) && (ReversalBuyBuffer[i + 1] != EMPTY_VALUE);
      bool prevRevSell  = (i + 1 < rates_total) && (ReversalSellBuffer[i + 1] != EMPTY_VALUE);
      bool prevTrendBuy = (i + 1 < rates_total) && (TrendBuyBuffer[i + 1] != EMPTY_VALUE);
      bool prevTrendSell= (i + 1 < rates_total) && (TrendSellBuffer[i + 1] != EMPTY_VALUE);

      // フィルター判定
      bool bigCandlePass = true;
      if(UseBigCandleFilter && i + 1 < rates_total) {
         double atrVal = iATR(Symbol(), PERIOD_CURRENT, ATRPeriod, i + 1);
         if((high[i + 1] - low[i + 1]) > atrVal * BigCandleATRMultiplier) bigCandlePass = false;
      }

      bool revConfirmBuyPass = true, revConfirmSellPass = true;
      if(UseReversalConfirmFilter) {
         double candleLength = high[i] - low[i];
         if(candleLength > 0) {
            double lowerWick = MathMin(open[i], close[i]) - low[i];
            double upperWick = high[i] - MathMax(open[i], close[i]);
            if(close[i] < open[i] && (lowerWick / candleLength) < MinWickConfirmRatio) revConfirmBuyPass = false;
            if(close[i] > open[i] && (upperWick / candleLength) < MinWickConfirmRatio) revConfirmSellPass = false;
         }
      }

      // 逆張りサイン
      if((!UseReversalTrendFilter || close[i] > htfEMA) && low[i] <= bbLower2 && rsiShort <= RSILowerLevel && rsiLong <= RSILowerLevel && !prevRevBuy) {
         if(bigCandlePass && revConfirmBuyPass) ReversalBuyBuffer[i] = low[i] - (10 * Point);
         else DangerBuyBuffer[i] = low[i] - (10 * Point);
      }
      if((!UseReversalTrendFilter || close[i] < htfEMA) && high[i] >= bbUpper2 && rsiShort >= RSIUpperLevel && rsiLong >= RSIUpperLevel && !prevRevSell) {
         if(bigCandlePass && revConfirmSellPass) ReversalSellBuffer[i] = high[i] + (10 * Point);
         else DangerSellBuffer[i] = high[i] + (10 * Point);
      }

      // 順張りフィルター
      bool counterPassBuy = true, counterPassSell = true;
      if(UseCounterMomentumFilter && i + 1 < rates_total) {
         double atrVal = iATR(Symbol(), PERIOD_CURRENT, ATRPeriod, i + 1);
         double prevBody = MathAbs(close[i + 1] - open[i + 1]);
         if(close[i + 1] > open[i + 1] && prevBody > atrVal * CounterMomentumATRMult) counterPassSell = false;
         if(close[i + 1] < open[i + 1] && prevBody > atrVal * CounterMomentumATRMult) counterPassBuy = false;
      }

      bool wickBuyPass = true, wickSellPass = true;
      if(UseWickFilter) {
         double candleLength = high[i] - low[i];
         if(candleLength > 0) {
            if(((high[i] - MathMax(open[i], close[i])) / candleLength) > MaxWickRatio) wickBuyPass = false;
            if(((MathMin(open[i], close[i]) - low[i]) / candleLength) > MaxWickRatio) wickSellPass = false;
         }
      }

      bool srBuyPass = true, srSellPass = true;
      if(UseSRLineFilter && i + SRLookbackBars < rates_total) {
         double recentSupport = low[iLowest(Symbol(), PERIOD_CURRENT, MODE_LOW, SRLookbackBars, i + 1)];
         if(MathAbs(close[i] - recentSupport) / pipsUnit <= SRBufferPips) srSellPass = false;
         double recentResistance = high[iHighest(Symbol(), PERIOD_CURRENT, MODE_HIGH, SRLookbackBars, i + 1)];
         if(MathAbs(recentResistance - close[i]) / pipsUnit <= SRBufferPips) srBuyPass = false;
      }

      bool emaDistPass = true;
      if(UseEMADistanceFilter && (MathAbs(close[i] - emaShort) / pipsUnit) > MaxEMADistancePips) emaDistPass = false;

      // 順張りサイン
      bool allowTrendSignal = !FilterTrendInRange || (!isRangeBar);
      if(allowTrendSignal && (emaShort > emaLong) && (close[i] > htfEMA) && close[i] >= bbUpper1 && rsiShort >= RSITrendBuyLevel && rsiLong >= RSITrendBuyLevel && !prevTrendBuy) {
         if(counterPassBuy && wickBuyPass && srBuyPass && emaDistPass) TrendBuyBuffer[i] = low[i] - (15 * Point);
         else DangerBuyBuffer[i] = low[i] - (15 * Point);
      }
      if(allowTrendSignal && (emaShort < emaLong) && (close[i] < htfEMA) && close[i] <= bbLower1 && rsiShort <= RSITrendSellLevel && rsiLong <= RSITrendSellLevel && !prevTrendSell) {
         if(counterPassSell && wickSellPass && srSellPass && emaDistPass) TrendSellBuffer[i] = high[i] + (15 * Point);
         else DangerSellBuffer[i] = high[i] + (15 * Point);
      }
   }
   return(rates_total);
}