const DATA = JSON.parse(decodeURIComponent(window.atob(BLOB)));
const INITIAL_DATE = new Date(2022, 4, 18, 23, 59, 59, 999);
const MIN_RANK = DATA[0].rank;
const MAX_RANK = DATA[DATA.length - 1].rank;

const TODAY = new Date();
function getGameNumber(date) {
    return Math.ceil(
        (
            (date - (date.getTimezoneOffset() * 60 * 1000)) -
            (INITIAL_DATE - (INITIAL_DATE.getTimezoneOffset() * 60 * 1000))
        ) / (1000 * 60 * 60 * 24)
    );

}
const GAME_NUMBER = getGameNumber(TODAY);

var statMap = {
    total: 0,
    wins: [0, 0, 0, 0, 0, 0]
}
function getGameNumberCountry(gameNumber) {
    var countryData = JSON.parse(JSON.stringify(DATA)) // deep copy
    Math.seedrandom("econle");
    for (var i = 1; i < gameNumber; i++) {
        var chosenIndex = parseInt(Math.random() * countryData.length);
        var historicalCountry = countryData[chosenIndex];
        if (Cookies.get(i) !== undefined) {
            var historicalGuesses = JSON.parse(Cookies.get(i));
            if (historicalGuesses.length > 0) {
                var lastGuess = historicalGuesses.slice(-1)[0]
                // doesn't zero out statMap so shouldn't run more than once
                if (lastGuess.name === historicalCountry.name) {
                    winIdx = Math.min(historicalGuesses.length - 1, 5);
                    statMap.wins[winIdx]++;
                }
                statMap.total++;
            }
        }
        countryData.splice(chosenIndex, 1);
        if (countryData.length < DATA.length * 0.1) {
            // threshold for re-adding countries
            countryData.push.apply(countryData, DATA);
        }
    }
    return countryData[parseInt(Math.random() * countryData.length)];
}

const COUNTRY = getGameNumberCountry(GAME_NUMBER);
const MAX_RANK_DIFF = Math.max(COUNTRY.rank - MIN_RANK, MAX_RANK - COUNTRY.rank);

function rankDiffPercent(target, guess) {
    return 100 - Math.ceil(100 * Math.abs(target.rank - guess.rank) / MAX_RANK_DIFF);
}

var guessNumber = 0;
var guesses = []

function percentToBlocks(percent) {
    var blockFills = [0, 0, 0, 0, 0];
    for (let i = 0; i < 5; i++) {
        var blockAmount = percent - i * 20;
        if (blockAmount >= 20) {
            blockFills[i] = 2;
        } else if (blockAmount >= 10) {
            blockFills[i] = 1;
        } else {
            blockFills[i] = 0;
        }
    }
    return blockFills;
}

function millionUSDToString(n) {
    var r = {econ: n.toString(), unit: "M"}
    if (n.toString().length > 3) {
        var f = n.toString().slice(0, 3);
        var p = n.toString().length - f.length;
        var q = ((p - 1) % 3 + 1);
        if (q < 3) {
            f = f.slice(0, q) + '.' + f.slice(q);
        }
        if (p < 4) {
            r.unit = "B";
        } else if (p < 7) {
            r.unit = "T";
        }
        r.econ = f;
    }
    return r;
}

function animateRowSquares(row) {
    var f = (i) => {
        if (i <= 5) {
            $(`#guess-sq-${i}-${row}`).animate({opacity: 1}).queue(() => f(i + 1));
        }
    };
    f(1);
}

/*
 * Returns -1 if failure, 0 if success, 1 if game over less, 2 if game over won
 */
function submitGuess(countryName) {
    var guessedCountry = null;
    for (let i = 0; i < DATA.length; i++) {
        if (DATA[i].name === countryName) {
            guessedCountry = DATA[i];
            break;
        }
    }
    if (guessedCountry === null) {
        return -1;
    }

    guessNumber++;
    guesses.push(guessedCountry);

    $('#guess-name-' + guessNumber).text(guessedCountry.name);
    var rankDP = rankDiffPercent(COUNTRY, guessedCountry);
    var blockFills = percentToBlocks(rankDP);
    for (let i = 1; i <= 5; i++) {
        $(`#guess-sq-${i}-${guessNumber}`).addClass(["gray", "yellow", "green"][blockFills[i - 1]]);
    }

    animateRowSquares(guessNumber);

    if (rankDP === 100) {
        $(`#guess-diff-${guessNumber}` + " > .currency").text("GG");
        return 2;
    }

    $(`#guess-diff-${guessNumber}` + "> .direction").text(`${guessedCountry.usdm > COUNTRY.usdm ? "+" : "-"}`);
    $(`#guess-diff-${guessNumber}` + "> .currency").text("$");
    var difference = millionUSDToString(Math.abs(guessedCountry.usdm - COUNTRY.usdm))
    $(`#guess-diff-${guessNumber}` + "> .value").text(`${difference.econ}`);
    $(`#guess-diff-${guessNumber}` + "> .unit").text(`${difference.unit}`);

    if (guessNumber === 6) {
        return 1;
    } else {
        return 0;
    }

}

function passGuess(guessText) {
    var r = submitGuess(guessText);
    if (r === -1) {
        $('#guess-submit').prop("disabled", true);
        setTimeout(() => $('#guess-submit').prop("disabled", false), 3000);
    } else {
        Cookies.set(GAME_NUMBER, JSON.stringify(guesses), {expires: 365 * 100});
        if (r > 0) {
            if (r == 2) {
                $('#guess-submit').prop("onclick", null).off("click");
                $('#guess-submit').html("&#127881;");
                statMap.wins[Math.min(guesses.length - 1, 5)]++;
            } else if (r == 1) {
                $('#guess-submit').prop("disabled", true);
                $('#guess-submit').html("&#128546;");
            }
            statMap.total++;

            $('#guess-input').prop("disabled", true);
            $('#target-name').text(COUNTRY.name);
            $('#target-name').animate({opacity: 0}).animate({opacity: 1}).animate({opacity: 0}).animate({opacity: 1});
            $('#share').show();
        }
        $('#guess-input').val('');
    }

}

function copyGame() {
    var guessesToWin = guessNumber;
    if (!(guesses[guesses.length - 1].name === COUNTRY.name)) {
        guessesToWin = "X";
    }
    var copyText = `econle ${GAME_NUMBER} ${guessesToWin}/6\n\n`;
    guesses.forEach(guess => {
        var rankDP = rankDiffPercent(COUNTRY, guess);
        var line = percentToBlocks(rankDP);
        line.forEach(fill => copyText += String.fromCodePoint([0x2b1b, 0x1f7e8, 0x1f7e9][fill]));
        copyText += "\n";
    });
    copyText += "\n" + window.location.host;

    navigator.clipboard.writeText(copyText);
    $('#share').prop("disabled", true).text("Copied");
    setTimeout(() => $('#share').prop("disabled", false).text("Share"), 3000);
}

function generateStats() {
    $('#stats-total').text(statMap.total);

    var maxWins = Math.max(...statMap.wins);
    var totalWins = 0;
    for (let i = 1; i <= 6; i++) {
        var norm = statMap.wins[i - 1] / maxWins;
        $(`#stat-bar-${i}`).css('width', `${norm * 100}%`);
        $(`#stat-counter-${i}`).text(statMap.wins[i - 1]);
        totalWins += statMap.wins[i - 1];
    }
    $(`#stats-win-rate`).text(parseInt(totalWins / statMap.total * 100));
}

function showInfo() {
    $('#info-button').text("Close");
    $('#info-button').attr("onclick", "showGame()");
    $('#stats-button').css('visibility', 'hidden');

    $('#game-container').hide();
    $('#info-container').show();
    $('#stats-container').hide();
}
function showStats() {
    generateStats();
    $('#stats-button').text("Close");
    $('#stats-button').attr("onclick", "showGame()");
    $('#info-button').css('visibility', 'hidden');

    $('#game-container').hide();
    $('#info-container').hide();
    $('#stats-container').show();
}
function showGame() {
    $('#info-button').text("Info");
    $('#info-button').attr("onclick", "showInfo()");
    $('#stats-button').css('visibility', 'visible');

    $('#stats-button').text("Stats");
    $('#stats-button').attr("onclick", "showStats()");
    $('#info-button').css('visibility', 'visible');

    $('#game-container').show();
    $('#info-container').hide();
    $('#stats-container').hide();
}

$(() => {

    $('#game-number').text(GAME_NUMBER);

    $('#guess-input').autocomplete({
        source: DATA.map(c => c.name).slice().sort(),
        position: {
            my: "left bottom",
            at: "left top",
            collision: "flip" }
    });

    var targetMetric = millionUSDToString(COUNTRY.usdm);
    $('#target-value').text(targetMetric.econ);
    $('#target-unit').text(targetMetric.unit);
    $('#target-name').text(COUNTRY.area);

    if (Cookies.get("VISITED_BEFORE") === undefined) {
        showInfo();
        Cookies.set("VISITED_BEFORE", "yes", {expires: 365 * 100});
    }

    if (Cookies.get(GAME_NUMBER) === undefined) {
        // write new cookie
        Cookies.set(GAME_NUMBER, JSON.stringify(guesses), {expires: 365 * 100});
    } else {
        savedGuesses = JSON.parse(Cookies.get(GAME_NUMBER));
        savedGuesses.forEach(guess => passGuess(guess.name));
    }

    $('#game-container').css('visibility', 'visible');

});




