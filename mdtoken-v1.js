console.log("nothing to see here, move along");
window.addEventListener('load', function() {

  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.log('No web3? You should consider trying MetaMask!')
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  }
  if (typeof web3 !== 'undefined'){
    $('#send-button').html('<button type="button" class="btn btn-info" data-toggle="modal" data-target="#myModal">Send Ether (via metamask)</button></p>')
  }


})

function send() {
     web3.eth.sendTransaction({
       from: web3.eth.coinbase,
       to: '0x9d1e27d75622cc16e35efb482cfbfa987da331a9',

       value: web3.toWei(document.getElementById("ether-amount").value, 'ether')
     }, function(error, result) {
       if (!error) {
         document.getElementById('response').innerHTML = 'Success: <a href="https://testnet.etherscan.io/tx/' + result + '"> View Transaction </a>'
       } else {
         document.getElementById('response').innerHTML = '<pre>' + error + '</pre>'
       }
     })
   }

function decodeStats(response, price) {
    if (response == null) return null;

    var result = response.result;
    if (result == null || result.length == null || result.length < 193) return null;

    var weiPerEther = new BigNumber("1000000000000000000", 10);

    var totalContributionExact = new BigNumber(result.substr(2, 64), 16).div(weiPerEther);
    var totalContributionUSDExact = totalContributionExact.times(new BigNumber(price));

    return {
        totalContribution: totalContributionExact.round(3, BigNumber.ROUND_DOWN),
        totalContributionUSD: totalContributionUSDExact.round(0, BigNumber.ROUND_DOWN),
        totalContributionTVs: totalContributionUSDExact.div(new BigNumber("25000")).round(0, BigNumber.ROUND_DOWN),
        totalSupply: new BigNumber(result.substr(66, 64), 16).div(weiPerEther).round(3, BigNumber.ROUND_DOWN),
        totalBonusTokensIssued: new BigNumber(result.substr(130, 64), 16).div(weiPerEther).round(3, BigNumber.ROUND_DOWN),
        purchasingAllowed: new BigNumber(result.substr(194, 64), 16).isZero() == false
    };
}

function getStats(price) {
    var url = "https://api.etherscan.io/api?module=proxy&action=eth_call&to=0x9d1e27d75622cc16e35efb482cfbfa987da331a9&data=0xc59d48470000000000000000000000000000000000000000000000000000000000000000&tag=latest"
    return $.ajax(url, {
        cache: false,
        dataType: "json"
    }).then(function (data) { return decodeStats(data, price); });
}

function getPrice() {
    var url = "https://api.etherscan.io/api?module=stats&action=ethprice";
    return $.ajax(url, {
        cache: false,
        dataType: "json"
    }).then(function (data) {
        if (data == null) return null;
        if (data.result == null) return null;
        if (data.result.ethusd == null) return null;

        return parseFloat(data.result.ethusd);
    });
}

function updatePage(stats) {
    if (stats == null) return;


    $("#total-ether").text(stats.totalContribution.toFixed(3));
    if (stats.totalContribution.toNumber() <= 0) {
        $("#total-ether-message").text("Looks like everyone read the warnings so far.");
    } else {
        $("#total-ether-message").text("I had a feeling someone would waste their money.");
    }
    percentage = (stats.totalContributionUSD.toNumber(0) / 1000000 * 100)
    $("#progress").css('width', percentage+'%')
    if (percentage > 1){
        $("#progress").text(percentage.toFixed(2)+'%')
    }

    $("#total-usd").text("$" + stats.totalContributionUSD.toFixed(0));
    if (stats.totalContributionUSD.toNumber() <= 0) {
        $("#total-usd-message").text("No Ether yet, so no cash either.");
    } else if (stats.totalContributionTVs.toNumber() < 1) {
        $("#total-usd-message").text("Not enough to buy a car yet.");
    }else if (stats.totalContributionTVs.toNumber() < 2) {
        $("#total-usd-message").text("Enough to buy a car.");
    } else {
        $("#total-usd-message").text("Enough to buy " + stats.totalContributionTVs.toFixed(0) + " cars!");
    }

    $("#total-tokens").text(stats.totalSupply.toFixed(3));
    if (stats.totalSupply <= 0) {
        $("#total-tokens-message").text("No useless tokens issued yet either.");
    } else if (stats.totalBonusTokensIssued.toNumber() <= 0) {
        $("#total-tokens-message").text("Look at all those useless tokens!");
    } else {
        $("#total-tokens-message").text("Including " + stats.totalBonusTokensIssued.toFixed(3) + " bonus tokens!");
    }

    $("#stats").show();
}

function refresh() { getPrice().then(getStats).then(updatePage); }

$(function() {
    try {
        refresh();
        setInterval(refresh, 1000 * 60 * 5);
    } catch (err) { }
});
