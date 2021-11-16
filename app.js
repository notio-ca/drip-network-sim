var app = new Vue({
    el: '#app',
    data: {
      version:"0.2",
      config: {
        day_interest: 0.01,
        day_max: 365,
        tax_deposit: 0.1,
        tax_withdraw: 0.1,
        tax_sell: 0.1,
        tax_compound: 0.05
      },
      balance_drip: 1000,
      bnb_price_usd: 100,
      bnb_drip_ratio: 0.03741699008180504, //0.01,
      gas_fee: 1.40,
      gas_fee_total: 0.000,
      faucet:{
          available: 0.000,
          deposit: 0.000,
          deposit_tx: [],
          claimed: 0.000,
          last_day_income: 0.000,
          investment: 0.00,
          withdraw: 0.00,
          sold: 0.00
      },
      drip_network_income:0,
      sim: {
          compound_mode: "EVERYSTEP",
          day_passed: 0,
          macro_record: false,
          macro: [],
          macro_cursor: 0
      }
    },
    created: function () {
        this.quote_bnbusd();
    },

    methods: {
      action(event, cmd) {
        var val = event.target.getAttribute("data-val");
        if (this.sim.macro_record && cmd.indexOf("macro") == -1) { this.sim.macro.push({cmd:cmd, val:val}); }
        this.execute(cmd, val);
      },
      execute(cmd, val) {
        switch (cmd) {
            case "deposit":           this.deposit(val); break;
            case "compound":          this.compound(); break;
            case "withdraw":          this.withdraw(); break;
            case "sell":              this.sell(); break;
            case "day-forward":       this.next_day(val); break;
            case "sim-compound-mode": this.sim.compound_mode = val; break;
            case "get_bnb_quote":     this.quote_bnbusd(val); break;               
            case "macro_run":         this.macro_run(); break;
            case "macro_record":      this.sim.macro_record = true; break;
            case "macro_stop":        this.sim.macro_record = false; break;
        }
      },
      pay_gas() { this.gas_fee_total += this.gas_fee; },
      deposit(amount) {
        tax = amount * this.config.tax_deposit;
        this.drip_network_income += tax;
        tx = { 
            amount:amount - tax, 
            day_left: this.config.day_max, 
            interest_paid:0.000
        }
        this.faucet.investment += parseFloat(amount);
        this.faucet.deposit += tx.amount;
        this.faucet.deposit_tx.push(tx);
        this.balance_drip = 0;
        this.pay_gas();
      },
      compound() {
        if (this.faucet.available == 0) { return false; }
        tax = this.faucet.available * this.config.tax_compound;
        this.drip_network_income += tax;
        tx = { 
            amount:this.faucet.available - tax, 
            day_left: this.config.day_max, 
            interest_paid:0.000
        }
        this.faucet.deposit += tx.amount;
        this.faucet.deposit_tx.push(tx);
        this.faucet.claimed += this.faucet.available;
        this.faucet.available = 0;
        this.pay_gas();
      },
      withdraw() {
        if (this.faucet.available == 0) { return false; }
        tax = this.faucet.available * this.config.tax_withdraw;
        this.drip_network_income += tax;
        this.faucet.withdraw += (this.faucet.available - tax);
        this.faucet.claimed += this.faucet.available;
        this.faucet.available = 0;
        this.pay_gas();
      },
      sell() {
        if (this.faucet.withdraw == 0) { return false; }
        tax = this.faucet.withdraw * this.config.tax_sell;
        this.drip_network_income += tax;
        this.faucet.sold += (this.faucet.withdraw - tax);
        this.faucet.withdraw = 0;
        this.pay_gas();
      },
      next_day(num_of_day) {
        for (var d = 1; d <= num_of_day; d++) { 
            this.faucet.last_day_income = 0;
            for (tx of this.faucet.deposit_tx) {
                if (tx.day_left == 0) { continue; }
                tx.day_left -= 1;
                interest = tx.amount * this.config.day_interest;
                tx.interest_paid += interest;
                this.faucet.last_day_income += interest;
            }
            this.faucet.available += this.faucet.last_day_income;
            this.sim.day_passed += 1;
            if (this.sim.compound_mode == "EVERYDAY") { this.compound(); }
        }
        if (this.sim.compound_mode == "EVERYSTEP") { this.compound(); }
      },
      drip_to_usd: function(value) {
        value = parseFloat(value) *  (this.bnb_price_usd * this.bnb_drip_ratio);
        return parseFloat(value.toFixed(3));
      },
      bnb_to_usd: function(value) {
        value = parseFloat(value) *  (this.bnb_price_usd);
        return parseFloat(value.toFixed(3));
      },
      quote_bnbusd: function() {
        API_Get("https://api.binance.com/api/v3/ticker/price?symbol=BNBBUSD", function (res) {
            app.bnb_price_usd = parseFloat(res.price);
        });
      },
      macro_run: function() {
        for (action of this.sim.macro) {
            this.execute(action.cmd, action.val);
        }

      }
    },    
    computed: {
        drip_usd: function() { return this.$options.filters.decimal_3(this.bnb_price_usd * this.bnb_drip_ratio); },
        faucet_max_payout: function() { return this.$options.filters.decimal_3(this.faucet.deposit * (this.config.day_max / 100)); },
        revenue_usd: function() { 
            investment_usd = this.faucet.investment;
            total_gas_fee_usd = this.gas_fee_total;
            withdraw_usd = this.faucet.withdraw;
            sold_usd = this.faucet.sold;
            return ((withdraw_usd + sold_usd) - (investment_usd + total_gas_fee_usd)).toFixed(2); 
        },
        month_passed: function() { return (this.sim.day_passed / 30.5).toFixed(1); },
        income_week: function () { return (this.faucet.last_day_income * 7).toFixed(2); },
        income_month: function () { return (this.faucet.last_day_income * 30.5).toFixed(2); }
    },
    filters: {
      decimal_3: function (value) {
        value = parseFloat(value).toFixed(3);
        if (value == "NaN") { value = 0; } 
        return value;
      }

    }
  });

// ----------------------------------------------------------------------------------------
// -- TOOLS -------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
async function API_Get(url, callback) {
    req = await fetch(url);
    res = await req.json();
    callback(res);
}
// ----------------------------------------------------------------------------------------
// -- BOOTSTRAP ---------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
(function () {
    var btn_all = document.querySelectorAll('.btn');
    for (btn of btn_all) {
        btn.addEventListener('mouseup', function(event) {
            event.currentTarget.blur();
            event.target.parentNode.blur();
            document.activeElement.blur();
        });
    }
})();
