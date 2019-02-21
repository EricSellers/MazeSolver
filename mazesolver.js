#!/usr/bin/env node

var Jimp = require('jimp');
var blueColor = 0x0000FFFF;
var greenColor = 0x00FF00FF;

if (process.argv.length < 3) {
  console.log("Usage %s imagefile", process.argv[1]);
  return;
}

console.log("loading %s", process.argv[2]);
Jimp.read(process.argv[2], (err, mazeimg) => {
  if (err) throw err;

  console.log("image loaded %dx%d", mazeimg.bitmap.width, mazeimg.bitmap.height);

  //find start stop locations
  var locations = findStartStopLocations(mazeimg);

  if (locations.length != 2) {
    throw ("Could not properly identify start stop locations");
  }

  //identify square and circle from gathered locations
  var startlocation = findSquare(mazeimg, locations);
  //clone image to use for solution image
  var mazeSolveImg = mazeimg.clone();
  solveMaze(mazeimg, mazeSolveImg, locations, startlocation);
  mazeSolveImg.write('mazesolution.jpg'); //save solution
});

function findStartStopLocations(mazeimg)
{
  var locations = [];

  for (var x = 0; x < mazeimg.bitmap.width; x += 17) {
    yloop:
    for (var y = 0; y < mazeimg.bitmap.height; y += 7) {
      var hexcolor = mazeimg.getPixelColor(x, y);
      var color = Jimp.intToRGBA(hexcolor);
      if (color.r == 255 && color.g == 0 && color.b == 0) {
        for (var i = 0; i < locations.length; i++) {
          //check if we already have this point
          if (locations[i].x == x && locations[i].y - y < 17) {
            //console.log("already have %s at %d x %d", color,  x, y);
            continue yloop;
          }
        }
        var location = { x: x, y: y };
        locations.push(location);
      }
    }
  }

  return locations;
}

/*
  use flood fill with backtrack to solve the maze
*/
function solveMaze(mazeimg, mazeSolveImg, locations, startlocation) {
  var start = locations[startlocation];
  var end = locations[(startlocation + 1) % 2];

  var backtrack = {};

  var pixelstack = [];
  pixelstack.push(start);
  while (pixelstack.length != 0) {
    var nextpoint;
    var curpoint = pixelstack.shift();

    if (curpoint.x == end.x && curpoint.y == end.y) {
      console.log("end found");
      //draw line from start to end
      while (backtrack[key(curpoint)] !== undefined) {
        curpoint = backtrack[key(curpoint)];
        mazeSolveImg.setPixelColor(blueColor, curpoint.x, curpoint.y);
      }
      return;
    }
    //mark this pixel as used
    mazeimg.setPixelColor(greenColor, curpoint.x, curpoint.y);

    //move right
    if (curpoint.x + 1 < mazeimg.bitmap.width) { //dont go off the edge of the image
      nextpoint = { x: curpoint.x + 1, y: curpoint.y };
      handlePixel(mazeimg, curpoint, nextpoint, backtrack, pixelstack);
    }

    //move left
    if (curpoint.x - 1 > 0) { //dont go off the edge of the image
      nextpoint = { x: curpoint.x - 1, y: curpoint.y };
      handlePixel(mazeimg, curpoint, nextpoint, backtrack, pixelstack);
    }

    //move up
    if (curpoint.y + 1 < mazeimg.bitmap.height) { //dont go off the edge of the image
      nextpoint = { x: curpoint.x, y: curpoint.y + 1 };
      handlePixel(mazeimg, curpoint, nextpoint, backtrack, pixelstack);
    }

    //move down
    if (curpoint.y - 1 >= 0) { //dont go off the edge of the image
      nextpoint = { x: curpoint.x, y: curpoint.y - 1 };
      handlePixel(mazeimg, curpoint, nextpoint, backtrack, pixelstack);
    }
  }
}

function handlePixel(mazeimg, curpoint, nextpoint, backtrack, pixelstack) {
  var hexcolor = mazeimg.getPixelColor(nextpoint.x, nextpoint.y);
  var color = Jimp.intToRGBA(hexcolor);

  if (backtrack[key(nextpoint)] === undefined && isBackground(color)) {
    backtrack[key(nextpoint)] = curpoint;
    pixelstack.push(nextpoint);
  }
}

function key(point) {
  return point.x + "x" + point.y;
}

function isBackground(color) {
  //if white or red consider it background color
  if (color.r == 255 && (color.g == 255 || color.g == 0) && (color.b == 255 || color.b == 0)) {
    return true;
  }
  return false;
}


/*
To see if location is square, find top left corner
while (x is red) x--
while (y is red) y--
 
if y+17 and x+17 is also red then it is square else circle.
Only need to test one location
*/
function findSquare(mazeimg, locations) {
  var x = locations[0].x;
  var y = locations[0].y;
  var color;
  var hexcolor;

  do {
    x--;
    hexcolor = mazeimg.getPixelColor(x, y);
    color = Jimp.intToRGBA(hexcolor);
  } while (color.r == 255 && color.g == 0 && color.b == 0);

  hexcolor = mazeimg.getPixelColor(x + 17, y);
  color = Jimp.intToRGBA(hexcolor);
  if (color.r == 255 && color.g == 0 && color.b == 0) {
    x += 1;//move back inside the red square
    do {
      y--;
      hexcolor = mazeimg.getPixelColor(x, y);
      color = Jimp.intToRGBA(hexcolor);
    } while (color.r == 255 && color.g == 0 && color.b == 0);

    hexcolor = mazeimg.getPixelColor(x, y + 17);
    color = Jimp.intToRGBA(hexcolor);
    if (color.r == 255 && color.g == 0 && color.b == 0) {
      //location 1 is the square
      console.log("found Start (circle) at ", locations[1]);
      console.log("found End (square) at ", locations[0]);
      return 1;
    }
  }
  //didnt find square at location 1 so it must be location 2
  console.log("found Start (circle) at ", locations[0]);
  console.log("found End (square) at ", locations[1]);

  return 0;
}