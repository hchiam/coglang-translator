'use strict';

const fs = require('fs');
const express = require('express');
const app = express();

if (!process.env.DISABLE_XORIGIN) {
  app.use(function(req, res, next) {
    var allowedOrigins = ['https://narrow-plane.gomix.me', 'https://www.freecodecamp.com'];
    var origin = req.headers.origin || '*';
    if(!process.env.XORIG_RESTRICT || allowedOrigins.indexOf(origin) > -1){
         console.log(origin);
         res.setHeader('Access-Control-Allow-Origin', origin);
         res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    }
    next();
  });
}


app.use('/public', express.static(process.cwd() + '/public'));


app.route('/:english')
  .get(function(req, res, next) {
    // console.log('some kind of custom request', req.params.english);
    
    // get request parameter data
    var requestData = req.params.english;
    requestData = requestData.toLowerCase();
    requestData = requestData.replace(/  +/g,' '); // (multiple -> single) spaces
    requestData = requestData.replace(/\?/g,' huh');
    requestData = requestData.replace(/[-,.!;:"]/g,''); // replace punctuation (notably inus ' and ?)
    
    // split into words
    requestData = requestData.split(' ');
    
    // set up response data
    var outputData = {long:[],short:[]};
    
    // "easter egg" hidden feature
    if (detectPuzzleSolutionRequest(requestData.join(' '))) {
      // immediately return JSON response
      outputData.long = "[ Nice try. :) Here's a hint: try a math sentence. ]";
      outputData.short = outputData.long;
      res.type('json').send(outputData);
      return;
    }
    
    // get dictionary before translate
    fs.readFile('output_shortlist.txt', 'utf8', function (err,data) {
      if (err) {
        return console.log(err);
      }
      // console.log(data);
      var dictionary = createDictionary(data);
      
      // go through each English word
      for (var i in requestData) {
        var engWord = requestData[i];
        engWord = replaceOneWords(engWord); // a/an/1 -> one
        engWord = replaceSpecialWords(engWord); // e.g. people -> persons
        var cogWord = '';
        var wordType = '';
        var lastIndex = engWord.length-1;
        // set response data
        if (engWord in dictionary) {
          cogWord = dictionary[engWord].cog;
          wordType = dictionary[engWord].type;
          // track words and word types
          outputData.long.push( [cogWord, wordType] );
          outputData.short.push( [getShortForm(cogWord), wordType] );
        } else if (engWord[lastIndex] === 's' && engWord.slice(0,lastIndex) in dictionary) {
          cogWord = dictionary[engWord.slice(0,lastIndex)].cog // may be plural or verb conjugation
          wordType = dictionary[engWord.slice(0,lastIndex)].type;
          if (wordType === 't') { // if plural
            // track words and word types, and add 'many' for plural
            outputData.long.push( [cogWord, wordType] );
            outputData.long.push( [dictionary['many'].cog, 'M'] );
            outputData.short.push( [getShortForm(cogWord), wordType] );
            outputData.short.push( [getShortForm(dictionary['many'].cog), 'M'] );
          } else { // otherwise probably verb conjugation or something else, so ignore the 's'
            // track words and word types
            outputData.long.push( [cogWord, wordType] );
            outputData.short.push( [getShortForm(cogWord), wordType] );
          }
        } else if (engWord.slice(-3) === "ing" && engWord.slice(0,-3) in dictionary) {
          // check for '-ing' conjugation
          cogWord = dictionary[engWord.slice(0,-3)].cog;
          wordType = dictionary[engWord.slice(0,-3)].type;
          // track words and word types
          outputData.long.push( [cogWord, wordType] );
          outputData.short.push( [getShortForm(cogWord), wordType] );
        } else if (engWord.slice(-2) === "ed" && engWord.slice(0,-2) in dictionary) {
          // check for '-ed' conjugation
          cogWord = dictionary[engWord.slice(0,-2)].cog;
          wordType = dictionary[engWord.slice(0,-2)].type;
          // track words and word types
          outputData.long.push( [cogWord, wordType] );
          outputData.short.push( [getShortForm(cogWord), wordType] );
        } else if (outputSpecialShortAndLongTranslations(engWord)) {
          // check for things like "can't" or "cannot" -> becomes multiple words
          var specialOutput = outputSpecialShortAndLongTranslations(engWord);
          // track words and word types
          outputData.long.push( [specialOutput.long, specialOutput.type] );
          outputData.short.push( [specialOutput.short, specialOutput.type] );
        } else if (engWord !== '') {
          // track words and word types
          outputData.long.push( ["[" + engWord + "]", ''] );
          outputData.short.push( ["[" + engWord + "]", ''] );
        }
      }
      
      var pluralL = '';
      var pluralS = '';
      var tempL = '';
      var tempS = '';
      var ignore;
      // put response data strings together, inserting plural when hit non-descriptor word
      for (var i=parseInt(outputData.long.length)-1; i>=0; i--) {
        if (outputData.long[i][1] === 'M') {
          pluralL = outputData.long[i][0] + ' ';
          pluralS = outputData.short[i][0] + ' ';
          ignore = i-1;
        } else if (i === 0) {
          if (isDeterminant(outputData.long[i][0])) { // special case for 'the'/'that'/'their'/etc.
            tempL = outputData.long[i][0] + ' ' + pluralL + tempL;
            tempS = outputData.short[i][0] + ' ' + pluralS + tempS;
          } else {
            tempL = pluralL + outputData.long[i][0] + ' ' + tempL;
            tempS = pluralS + outputData.short[i][0] + ' ' + tempS;
          }
        } else if (outputData.long[i][1] !== '?' && (outputData.long[i][1] !== 'd' || isDeterminant(outputData.long[i][0])) && i<ignore) {
          // stop at non-descriptor word or at word for 'the'/'that'/determiners ('naglo' in both long/short translations)
          tempL = outputData.long[i][0] + ' ' + pluralL + tempL;
          tempS = outputData.short[i][0] + ' ' + pluralS + tempS;
          // reset for next use, in case get to end
          pluralL = '';
          pluralS = '';
        } else {
          tempL = outputData.long[i][0] + ' ' + tempL;
          tempS = outputData.short[i][0] + ' ' + tempS;
        }
      }
      
      // clean up response data
      outputData.long = tempL.trim();
      outputData.short = tempS.trim();
      
      // finally return JSON response
      res.type('json').send(outputData);
      
    });
  });
  

app.route('/')
    .get(function(req, res) {
		  res.sendFile(process.cwd() + '/views/index.html');
    })


// Respond not found to all the wrong routes
app.use(function(req, res, next){
  res.status(404);
  res.type('txt').send('404: Not found');
});


// Error Middleware
app.use(function(err, req, res, next) {
  if(err) {
    res.status(err.status || 500)
      .type('txt')
      .send(err.message || 'SERVER ERROR');
  }  
})


app.listen(process.env.PORT, function () {
  console.log('Node.js listening ...');
});



// custom function(s):

function createDictionary(str) { // creates a "hash table" for faster searching
  var ht = {};
  var l = str.split('\n');
  for (var i in l) {
    var entry = l[i].split(',');
    var eng = entry[1];
    var cog = entry[0];
    var typ = entry[entry.length-1];
    ht[eng] = {'cog':cog,'type':typ};
  }
  return ht;
}

function getShortForm(cog) {
  var vowels = 'aeiou';
  var indexStopBefore = cog.length;
  var vowelCount = 0;
  for (var i in cog) {
    var letter = cog[i];
    if (vowels.includes(letter)) {
      vowelCount += 1;
      if (vowelCount >= 2) {
        // index2ndLastVowel = parseInt(i)+1; break;
        if (cog[parseInt(i)+1] !== null) {
          if (vowels.includes(cog[parseInt(i)+1])) {
            indexStopBefore = parseInt(i)+1;
          } else {
            indexStopBefore = parseInt(i)+2;
          }
          break;
        }
      }
    }
  }
  return cog.slice(0,indexStopBefore);
}

function replaceOneWords(word) { // a/an/1 -> one
  if (word === 'a' || word === 'an' || word === '1') {
    return 'one';
  } else {
    return word;
  }
}

function replaceSpecialWords(word) { // e.g. people -> persons
  if (word === 'people') return 'persons';
  return word;
}

function outputSpecialShortAndLongTranslations(word) {
  const output = {
    short: '',
    long: '',
    type: ''
  }
  if (word === 'cannot' || word === "can't") {
    output.short = 'buneh nanot';
    output.long = 'bunehc nanotpodsakad';
    output.type = 'a';
  } else {
    return false;
  }
  return output;
}

function isDeterminant(word) {
  let check = getShortForm(word);
  // check for "determinants": the/this/that/these/those/my/our/your/yours/his/her/their
  return (check === 'naglo' || 
          check === 'djestey' || 
          check === 'nasev' || 
          check === 'djactos' || 
          check === 'nacos' || 
          check === 'wodmoy' || 
          check === 'wonwes' || 
          check === 'nitum' || 
          check === 'nimvwec' || 
          check === 'tadsus' || 
          check === 'tamkas');
}

function detectPuzzleSolutionRequest(requestData) { // "easter egg" hidden feature
  return (requestData === 'yikwah harwe ardvos castah kidwoc huh') || (requestData === 'yikwah harwe ardvos castah kidwoc');
}
