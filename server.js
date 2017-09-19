 /******************************************************
 * PLEASE DO NOT EDIT THIS FILE
 * the verification process may break
 * ***************************************************/

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

// app.route('/_api/package.json')
//   .get(function(req, res, next) {
//     console.log('requested');
//     fs.readFile(__dirname + '/package.json', function(err, data) {
//       if(err) return next(err);
//       res.type('txt').send(data.toString());
//     });
//   });


app.route('/:english')
  .get(function(req, res, next) {
    console.log('some kind of custom request');
    
    // get request parameter data
    var requestData = req.params.english.split(' ');
    
    // set up response data
    var outputData = {long:'',short:''};
    
    // get dictionary before translate
    fs.readFile('output_shortlist.txt', 'utf8', function (err,data) {
      if (err) {
        return console.log(err);
      }
      console.log(data);
      var dictionary = createDictionary(data);
      
      // go through each English word
      for (var e in requestData) {
        var engWord = requestData[e];
        var cogWord = dictionary[engWord];
        // set response data
        outputData.long += cogWord + ' ';
        outputData.short += getShortForm(cogWord) + ' ';
      }
      
      // clean up response data
      outputData.long = outputData.long.trim();
      outputData.short = outputData.short.trim();
      
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
    ht[eng] = cog;
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
