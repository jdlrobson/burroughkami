var express = require('express')
var firstline = require('firstline');
var fs = require('fs')
var walk = require('walk')
var app = express()
var path = require('path')
var crypto = require('crypto');
var bodyParser = require('body-parser');
app.use(express.static('public'));
app.use( bodyParser.json({limit: '50mb'}) ); // support json encoded bodies
app.use( bodyParser.urlencoded( {     // to support URL-encoded bodies
  extended: true,
	limit: '50mb'
} ) );
var notes;
function loadNotes() {
  return new Promise( (resolve, reject) => {
    var pathToNotes = `${path.resolve(__dirname)}/notes/`;
    notes = [];
    walker = walk.walk(pathToNotes);

    walker.on('directory', (root, fileStats, next) => {
      firstline(`${pathToNotes}${fileStats.name}/1.txt`).then((title) => {
        title = title.trim();
        notes.push( { id: fileStats.name, title: title || '{Untitled}' } );
        next();
      }).catch(() => {
        next();
      });
    }).on('end', () => {
      resolve(notes);
    });
  });
}
loadNotes();

var actionUrl = '/post'
var cutupForm = `
<form action="/cutup" method="post">
  <input type="submit" value="Cutup several of your notes" />
</form>`;

var form = `
<h2>Create new note</h2>
<form action="${actionUrl}" method="post">
  <textarea name="text"></textarea>
  <input type="submit" value="Save note" />
</form>`;

function errorPage(res) {
  res.send(doc('oh poo'));
}
function doc(body) {
  return `<html><head><link rel="stylesheet" href="/stylesheet.css">
   </head><body>${body} <script src="/scripts.js"></script></body></html>`
}

function openNote(id) {
  return new Promise( (resolve) => {
    var dir = `${path.resolve(__dirname)}/notes/${id}/1.txt`;
    fs.readFile(dir, (err, data) => {
      if (err) {
        throw 'Bah';
      }
      firstline(dir).then((title) => {
        resolve({ id: id, text: data.toString(), title: title });
      }).catch(() => {});
    });
  });
}

function randomNote() {
  return loadNotes().then((notes) => {
    var note = notes[parseInt(Math.random() * notes.length - 1, 10)];
    return openNote(note.id);
  });
}

function shuffle(words) {
	var newText = [], i, phraseLength;
	while ( words.length ) {
		i = parseInt( Math.random() * words.length -1, 10 );
		phraseLength = parseInt( Math.random() * 9, 10 );
		newText = newText.concat(words.splice(i, phraseLength));
	}
	return newText;
}

function cutup(text) {
	var words = text.replace(/\n\r/g, ' ').split(' ');
	var cut = shuffle(words);
  return cut.join(' ').toLowerCase();
}

function combineNotes(num, sources) {
  var input = '';
  sources = sources || {};
  return randomNote().then((note) => {
    if ( !sources[note.id] ) {
      input += note.text;
      sources[ note.id ] = note.title;
    }
   if ( num === 0 ) {
      return [ input, sources ];
    } else {
      return combineNotes(num-1, sources).then((val) => {
        return [ input + val[0], sources ];
      });
    }
  });
}

app.post('/cutup', function (req, res) {
  // take 3 notes as input
  combineNotes(4).then((input)=> {
    var myNotes = input[1];
    var links = Object.keys(myNotes).
      map((id) => `<a href="/notes/${id}">${myNotes[id]}</a>`).join(', ');
    res.send(doc(
      `<h1>Combo cut-up</h1>
<div>This is a cutup of the combined text of the notes ${links}:</div><textarea class="note">${cutup(input[0])}</textarea>`));
  });
})

app.get('/notes/:note', function (req, res) {
  var id = req.params.note;
  openNote(id).then((note) => {
    console.l
    res.send(
      doc(
        `<a href="/notes">back to notes</a> <a href="/notes/${id}/cutup">cutup this note</a><hr/>
        <h2>${note.title}</h2>
        <textarea class="note" readonly>${note.text}</textarea>`
      )
    );
  }).catch(()=>{
    errorPage(res);
  });
})

app.get('/notes/:note/cutup', function (req, res) {
  var id = req.params.note;
  openNote(id).then((note) => {
    res.send(
      doc(
        `<a href="/notes">notes</a><hr/>
        <h2>Cut-up of ${note.title}</h2>
        <textarea class="note" readonly>${cutup(note.text)}</textarea>`
      )
    ).catch(()=>{
      errorPage(res);
    });
  });
})

app.get('/notes/', function (req, res) {
  var list = notes.map((note) => {
    return `<li><a href="/notes/${note.id}">${note.title}</a></li>`;
  }).join(' ');

  res.send(doc(
    `${form}<hr/>
<h2>All your notes</h2>
${cutupForm}
<ul>${list}</ul>`
  ));
})

app.post('/post', function (req, res) {
  var text = req.body.text;
  var hash = crypto.createHash('md5').update(text).digest('hex');
  var base = `${path.resolve(__dirname)}/notes`;
  var dir = `${base}/${hash}`;

  if (!fs.existsSync(base)){
      fs.mkdirSync(base);
  }
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
  }
  fs.writeFile(`${dir}/1.txt`, text, function (err) {
    if (err) {
      errorPage(res);
    } else {
      loadNotes();
      res.redirect( `/notes/${hash}` );
    }
  });
})

app.post('/cutup', function (req, res) {
  var note1 = notes[parseInt(Math.random()*notes.length-1, 10)];
  var note2 = notes[parseInt(Math.random()*notes.length-1, 10)];
  
})

app.get('/', function (req, res) {
  var list = [
    '<a href="/notes">List all your notes</a>'
  ];

  res.send(doc(
    `<h1>Welcome to Burroughkami</h1>
    ${form}<hr/>${list}`
  ));
})

app.listen(3000, function () {
  console.log(`Live on port 3000`)
})