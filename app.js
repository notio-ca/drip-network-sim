var app = new Vue({
    el: '#app',
    data: {
      version:"0.2",
      config: {
        day_interest: 0.01,
        day_max: 365,
        tax_deposit: 0.1,
        tax_withdraw: 0.1,
        tax_compound: 0.05
      },
      balance_drip: 100,
      bnb_price_usd: 100,
      bnb_drip_ratio: 0.01,
      gas_fee_bnb: 0.003486495,
      gas_fee_total: 0.000,
      faucet:{
          available: 0.000,
          deposit: 0.000,
          deposit_tx: [],
          claimed: 0.000,
          last_day_income: 0.000,
          investment: 0.00,
          withdraw: 0.00
      },
      drip_network_income:0,
      sim: {
          compound_mode: "NONE",
          day_passed: 0,
          day_forward: 1
      }
    },
    created: function () {
  
    },
    computed: {
        drip_bnb: function() { return this.$options.filters.decimal_3(this.bnb_drip_ratio); },
        drip_usd: function() { return this.$options.filters.decimal_3(this.bnb_price_usd * this.bnb_drip_ratio); },
        faucet_max_payout: function() { return this.$options.filters.decimal_3(this.faucet.deposit * (this.config.day_max / 100)); },
        revenue_usd: function() { 
            total_gas_fee_usd = this.bnb_to_usd(this.gas_fee_total);
            withdraw_usd = this.drip_to_usd(this.faucet.withdraw);
            return this.$options.filters.decimal_3(withdraw_usd - this.faucet.investment - total_gas_fee_usd); 
        }
    },
    methods: {
      action(event, cmd) {
        var val = event.target.getAttribute("data-val");
        switch (cmd) {
            case "deposit":
                this.deposit(val);
                break;
            case "withdraw":
                this.withdraw(val);
                break;
            case "day-forward":
                this.next_day(val);
                break;
            case "sim-compound-mode":
                this.sim.compound_mode = val;
                break;
            case "compound":
                this.compound(val);
                break;
        }
   
      },
      deposit(amount) {
        tax = amount * this.config.tax_deposit;
        this.drip_network_income += tax;
        tx = { 
            amount:amount - tax, 
            day_left: this.config.day_max, 
            interest_paid:0.000
        }
        this.faucet.investment += amount;
        this.faucet.deposit += tx.amount;
        this.faucet.deposit_tx.push(tx);
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
        this.gas_fee_total += parseFloat(this.gas_fee_bnb);
      },
      withdraw(amount) {
        if (this.faucet.available == 0) { return false; }
        tax = this.faucet.available * this.config.tax_withdraw;
        this.drip_network_income += tax;
        this.faucet.withdraw += (this.faucet.available - tax);
        this.faucet.claimed += this.faucet.available;
        this.faucet.available = 0;
        this.gas_fee_total += parseFloat(this.gas_fee_bnb);
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
        return value.toFixed(3);
      },
      bnb_to_usd: function(value) {
        value = parseFloat(value) *  (this.bnb_price_usd);
        return value.toFixed(3);
      }
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
