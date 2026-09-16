#property strict
#property version   "1.0"
#property description "DEMO-ONLY connector for the XAUUSD Signal Terminal. It never sends broker orders."

// IMPORTANT: This EA is deliberately simulation-only. There is no OrderSend/CTrade
// execution path in this file. It polls the Vercel terminal and records virtual trades.

input string SignalURL = "https://xauusd-signal-terminal-411paw7gw-ikiara.vercel.app/api/mt5-signal";
input int PollSeconds = 30;
input int MaxSignalAgeSeconds = 120;
input double VirtualUnits = 1.0;
input bool SimulationEnabled = true;

string LastSignalId = "";
string PositionDirection = "NONE";
double EntryPrice = 0.0;
double StopPrice = 0.0;
double TargetPrice = 0.0;
double VirtualPnL = 0.0;
int SimulatedTrades = 0;
datetime LastPoll = 0;

string JsonString(const string json, const string key)
{
   string needle = "\"" + key + "\":\"";
   int p = StringFind(json, needle);
   if(p < 0) return "";
   p += StringLen(needle);
   int e = StringFind(json, "\"", p);
   if(e < 0) return "";
   return StringSubstr(json, p, e - p);
}

double JsonNumber(const string json, const string key)
{
   string needle = "\"" + key + "\":";
   int p = StringFind(json, needle);
   if(p < 0) return EMPTY_VALUE;
   p += StringLen(needle);
   int e = p;
   while(e < StringLen(json))
   {
      ushort c = StringGetCharacter(json, e);
      if((c >= '0' && c <= '9') || c == '-' || c == '+' || c == '.' || c == 'e' || c == 'E') e++;
      else break;
   }
   return StringToDouble(StringSubstr(json, p, e - p));
}

void SetStatus(const string text)
{
   Comment("XAUUSD MT5 DEMO AUTO-TRADER\n",
           "MODE: DEMO / SIMULATION ONLY\n",
           "Connection: ", text, "\n",
           "Last poll: ", TimeToString(LastPoll, TIME_DATE|TIME_SECONDS), "\n",
           "Virtual trades: ", IntegerToString(SimulatedTrades), "\n",
           "Virtual P/L: ", DoubleToString(VirtualPnL, 2), "\n",
           "Position: ", PositionDirection,
           PositionDirection != "NONE" ? " @ " + DoubleToString(EntryPrice, 3) : "");
}

void CloseVirtualPosition(const double price, const string reason)
{
   if(PositionDirection == "NONE") return;

   double points = PositionDirection == "BUY" ? price - EntryPrice : EntryPrice - price;
   VirtualPnL += points * VirtualUnits;
   Print("DEMO CLOSE | ", PositionDirection,
         " entry=", DoubleToString(EntryPrice, 3),
         " exit=", DoubleToString(price, 3),
         " virtualPnL=", DoubleToString(points * VirtualUnits, 3),
         " reason=", reason);

   PositionDirection = "NONE";
   EntryPrice = 0.0;
   StopPrice = 0.0;
   TargetPrice = 0.0;
}

void OpenVirtualPosition(const string direction, const double price, const double sl, const double tp)
{
   PositionDirection = direction;
   EntryPrice = price;
   StopPrice = sl;
   TargetPrice = tp;
   SimulatedTrades++;
   Print("DEMO OPEN | ", direction,
         " entry=", DoubleToString(price, 3),
         " SL=", DoubleToString(sl, 3),
         " TP=", DoubleToString(tp, 3));
}

void CheckVirtualExit(const double price)
{
   if(PositionDirection == "BUY")
   {
      if(price <= StopPrice) CloseVirtualPosition(StopPrice, "virtual stop");
      else if(price >= TargetPrice) CloseVirtualPosition(TargetPrice, "virtual target");
   }
   else if(PositionDirection == "SELL")
   {
      if(price >= StopPrice) CloseVirtualPosition(StopPrice, "virtual stop");
      else if(price <= TargetPrice) CloseVirtualPosition(TargetPrice, "virtual target");
   }
}

void ProcessSignal(const string json)
{
   string status = JsonString(json, "status");
   if(status != "ok")
   {
      Print("DEMO connector: invalid server status");
      return;
   }

   string mode = JsonString(json, "mode");
   if(mode != "DEMO_ONLY")
   {
      Print("DEMO connector: rejected non-demo response");
      return;
   }

   string id = JsonString(json, "id");
   string direction = JsonString(json, "direction");
   double price = JsonNumber(json, "price");
   double sl = JsonNumber(json, "sl");
   double tp = JsonNumber(json, "tp2");
   double age = JsonNumber(json, "ageSeconds");

   if(id == "" || price == EMPTY_VALUE || age == EMPTY_VALUE || age > MaxSignalAgeSeconds)
   {
      Print("DEMO connector: stale/incomplete signal rejected. age=", DoubleToString(age, 0));
      return;
   }

   if(id == LastSignalId) return;
   LastSignalId = id;

   MqlTick tick;
   if(!SymbolInfoTick(_Symbol, tick))
   {
      Print("DEMO connector: no MT5 price available for simulation");
      return;
   }

   double marketPrice = (direction == "SELL") ? tick.bid : tick.ask;
   CheckVirtualExit(marketPrice);

   Print("DEMO SIGNAL | ", direction,
         " score=", JsonNumber(json, "score"),
         " confidence=", JsonNumber(json, "confidence"),
         " terminalPrice=", DoubleToString(price, 3));

   if(!SimulationEnabled || (direction != "BUY" && direction != "SELL"))
   {
      SetStatus("connected - signal logged");
      return;
   }

   if(PositionDirection == direction)
   {
      SetStatus("connected - position already simulated");
      return;
   }

   if(PositionDirection != "NONE")
      CloseVirtualPosition(marketPrice, "opposite signal");

   OpenVirtualPosition(direction, marketPrice, sl, tp);
   SetStatus("connected - demo signal processed");
}

void PollServer()
{
   LastPoll = TimeCurrent();
   char result[];
   char post[];
   string headers = "Accept: application/json\r\n";
   string response_headers;

   ResetLastError();
   int code = WebRequest("GET", SignalURL, headers, 10000, post, result, response_headers);
   if(code == -1)
   {
      int err = GetLastError();
      SetStatus("WebRequest blocked/error " + IntegerToString(err));
      Print("DEMO connector: add the Vercel host to MT5 WebRequest allowed URLs. Error=", err);
      return;
   }

   string body = CharArrayToString(result);
   if(code != 200)
   {
      SetStatus("server HTTP " + IntegerToString(code));
      Print("DEMO connector: HTTP ", code, " body=", body);
      return;
   }

   ProcessSignal(body);
}

int OnInit()
{
   if(!SimulationEnabled)
   {
      Print("DEMO connector refuses to start because SimulationEnabled=false.");
      return INIT_PARAMETERS_INCORRECT;
   }

   EventSetTimer(MathMax(5, PollSeconds));
   LastPoll = TimeCurrent();
   SetStatus("starting");
   PollServer();
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
   Comment("");
}

void OnTimer()
{
   MqlTick tick;
   if(SymbolInfoTick(_Symbol, tick))
   {
      double marketPrice = (PositionDirection == "SELL") ? tick.bid : tick.ask;
      CheckVirtualExit(marketPrice);
   }
   PollServer();
}
