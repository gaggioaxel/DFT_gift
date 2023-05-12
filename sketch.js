var x = [];
var fourierX;
var time = 0;
var path = [];

var scaleCoeff = null;
var x_translate = null;
var y_translate = null;
var drawing = null;
var centerLeftEye = null;
var centerRightEye = null;
var minSpeedValue = null;
var maxSpeedValue = null;
var prevSpeedValue = null;
var prevSpeedString = null;
var prevTrackingValue = 1;
var prevRotationPercentage = null;
var eyesDraw = null;

var minDrawingSize = null;
var maxDrawingSize = null;
var diffDrawingSize = null;
var avg = null;
var variance = null;
var dt = null;

// Drawing elements
let currDrawing = null;
let drawingMap = {"Cri text":10,"Portrait":11}


// UI elements
let speedSliderLabel;
let speedSlider;
let rewindDraw;
let mainPhaseLabel;
let trackGhostSliderLabel;
let trackGhostSlider;
let changeDrawingButton;


// State parameters
const INSERTING_PASSWORD = 0;
const LOADING = 1
const AUTO_DRAWING = 2;

var STATE = INSERTING_PASSWORD;//AUTO_DRAWING;
var PASSWORD_INCORRECT = false;
var shaking_dir = null;


const PORTRAIT = 0;
const LANDSCAPE = 1;

var ORIENTATION = null;


// BETA PARAMETERS
var passwordInput = null;



function calculateDrawingStatistics() {
  avg = [0,0];
  sq_avg = [0,0];
  maxDrawingSize = [-10000,-10000]
  minDrawingSize = [10000,10000]
  counter = 0;
  for (let i = 0; i < drawing.length; i++) {
    if (drawing[i].x > 0) {
      avg[0] += drawing[i].x;
      sq_avg[0] += drawing[i].x**2;
      avg[1] += drawing[i].y;
      sq_avg[1] += drawing[i].y**2;
      maxDrawingSize = [max(maxDrawingSize[0],drawing[i].x),max(maxDrawingSize[1],drawing[i].y)];
      minDrawingSize = [min(maxDrawingSize[0],drawing[i].x),min(maxDrawingSize[1],drawing[i].y)]
      counter++;
    }
  }
  diffDrawingSize = [maxDrawingSize[0]-minDrawingSize[0],maxDrawingSize[0]-minDrawingSize[0]]
  avg[0] /= counter;
  avg[1] /= counter;
  sq_avg[0] /= counter;
  sq_avg[1] /= counter;
  variance = [sq_avg[0]-avg[0]**2,sq_avg[1]-avg[1]**2]
}

function calculatePath(){
  x = [] 
  for (let i = 0; i < drawing.length-1; i += prevSpeedValue) {
    const c = new Complex((drawing[i].x-avg[0])/diffDrawingSize[0]*scaleCoeff, (drawing[i].y-avg[1])/diffDrawingSize[1]*scaleCoeff);
    x.push(c);
  }
  x.push(new Complex((drawing[drawing.length-1].x-avg[0])/diffDrawingSize[0]*scaleCoeff, (drawing[drawing.length-1].y-avg[1])/diffDrawingSize[1]*scaleCoeff))
  fourierX = dft(x);
  fourierX.sort((a, b) => b.amp - a.amp);
  dt = TWO_PI / fourierX.length;
}
 
function setPictureCanvasParameters(drawingSelect) {
  portrait_values = { minSpeedValue:max(1,int(drawing_portrait.length/4000)),
                      maxSpeedValue:100,
                      centerLeftEye:[width/2-120,height/2+150],
                      centerRightEye:[width/2+148,height/2+70],
                      x_translate:int((maxDrawingSize[0]-avg[0])/diffDrawingSize[0]*scaleCoeff),  
                      y_translate:-100, 
                      scaleCoeff:480 }
  cri_values = {  minSpeedValue:max(1,int(drawing_word.length/3000)),
                  maxSpeedValue:100,
                  x_translate:0,  
                  y_translate:-100, 
                  scaleCoeff:80 }
                  
  if (drawingSelect==drawingMap["Cri text"]) {
    values = cri_values
  } else {
    values = portrait_values
    if(ORIENTATION == LANDSCAPE) {
      values.scaleCoeff = 400
      values.centerLeftEye = [width/2-103,height/2+125]
      values.centerRightEye = [width/2+120,height/2+60]
    }
    eyesDraw = [false,false];
  }
  centerLeftEye = values.centerLeftEye
  centerRightEye = values.centerRightEye
  minSpeedValue = values.minSpeedValue
  maxSpeedValue = values.maxSpeedValue
  x_translate = values.x_translate;
  y_translate = values.y_translate;
  scaleCoeff = values.scaleCoeff;
}

function loadUI() {
  prevRotationPercentage = 0;
  prevSpeedValue = int(minSpeedValue + (maxSpeedValue-minSpeedValue)/10);

  speedSlider = createSlider(minSpeedValue,maxSpeedValue,prevSpeedValue);
  speedSliderLabel = createElement("label","Speed")
  speedSliderLabel.style("color:rgb(255, 255, 255);")
  rewindLabel = createElement("label","Include Rewind");
  rewindLabel.style("color:rgb(255, 255, 255);")
  rewindDraw = createCheckbox("",true);
  if(ORIENTATION==LANDSCAPE) {
    speedSlider.size(700,30)
    speedSlider.position(0.03*windowWidth,0.95*windowHeight);
    speedSliderLabel.position(0.03*windowWidth+speedSlider.size().width/2-speedSliderLabel.size().width/2,0.93*windowHeight);
    rewindLabel.position(0.425*windowWidth-rewindLabel.size().width,0.93*windowHeight);
    rewindDraw.position(0.425*windowWidth-(rewindLabel.size().width/2),0.95*windowHeight);
  } else {
    speedSlider.size(700,30)
    speedSlider.position(0.5*windowWidth-speedSlider.size().width/2,0.85*windowHeight);
    speedSliderLabel.position(0.5*windowWidth-speedSliderLabel.size().width/2,0.835*windowHeight);
    rewindLabel.position(0.3*windowWidth-rewindLabel.size().width,0.93*windowHeight);
    rewindDraw.position(0.3*windowWidth-(rewindLabel.size().width/2),0.95*windowHeight);
  }
  
  mainPhaseLabel = createElement("label","Rotation = 0.00");
  mainPhaseLabel.style("color:rgb(255, 255, 255);")
  mainPhaseLabel.position(0.5*windowWidth-mainPhaseLabel.size().width/2,0.93*windowHeight);

  drawCirclesLabel = createElement("label","Show circles")
  drawCirclesLabel.style("color:rgb(255, 255, 255);")
  drawCircles = createCheckbox("",false);
  drawCircles.style("width:60px; height:60px;")
  trackGhostSlider = createSlider(0.02,1,prevTrackingValue,0.02);
  trackGhostSliderLabel = createElement("label","Keep")
  trackGhostSliderLabel.style("color:rgb(255, 255, 255);")
  if(ORIENTATION == LANDSCAPE) {
    trackGhostSlider.size(700,30)
    trackGhostSlider.position(0.97*windowWidth-trackGhostSlider.size().width,0.95*windowHeight);
    trackGhostSliderLabel.position(0.97*windowWidth-trackGhostSlider.size().width/2-trackGhostSliderLabel.size().width/2,0.93*windowHeight);
    drawCirclesLabel.position(0.575*windowWidth,0.93*windowHeight);
    drawCircles.position(0.575*windowWidth+(drawCirclesLabel.size().width/2-10),0.95*windowHeight);
  } else {
    trackGhostSlider.size(700,30)
    trackGhostSlider.position(0.5*windowWidth-trackGhostSlider.size().width/2,0.9*windowHeight);
    trackGhostSliderLabel.position(0.5*windowWidth-trackGhostSliderLabel.size().width/2,0.885*windowHeight);
    drawCirclesLabel.position(0.7*windowWidth,0.93*windowHeight);
    drawCircles.position(0.7*windowWidth+(drawCirclesLabel.size().width/2-10),0.95*windowHeight);
  }

  drawingSelector = createSelect()
  drawingSelector.option("Cri text")
  drawingSelector.option("Portrait")
  drawingSelector.selected("Cri text")
  drawingSelector.changed(reloadPictureCanvas)
  drawingSelector.size(140,40)
  drawingSelector.style("font-family:Montserrat; font-size:large;text-align:center;");
  drawingSelector.position(0.5*windowWidth-drawingSelector.size().width/2,0.955*windowHeight);
}


function reloadPictureCanvas(){
  let drawingSelectorValue = drawingMap[drawingSelector.value()]
  if(drawingSelectorValue != currDrawing) {
    let drawingMapRev = {10:["Cri text",drawing_word],11:["Portrait",drawing_portrait]}
    currDrawing = drawingSelectorValue
    drawing = drawingMapRev[currDrawing][1]
    calculateDrawingStatistics()
    setPictureCanvasParameters(drawingSelectorValue)
    removeElements()
    loadUI()
    drawingSelector.selected(drawingMapRev[currDrawing][0])
    resetDraw()
    calculatePath()
  }
}

function setup() {
  if (windowWidth/windowHeight < 1)
    ORIENTATION = PORTRAIT
  else
    ORIENTATION = LANDSCAPE
  createCanvas(windowWidth,windowHeight);
}

function loadStart() {
  if(passwordInput == null) {
    //console.log(sha256("i wolf you"))
    passwordInput = createInput("")
    passwordInput.size(300)
    passwordInput.position(width/2-passwordInput.size().width/2,height/2-passwordInput.size().height/2)
    //passwordInput.input(insertingPassword)
    passwordText = createElement("label","Insert password and press ENTER")
    passwordText.size(400,50)
    passwordText.position(width/2-passwordText.size().width/2,height/2+passwordInput.size().height/2+50)
    //STATE = AUTO_DRAWING
    //textOnScreen = createElement("label","Push me(eeen) <3")
    //textOnScreen.position(windowWidth/2-50, windowHeight/2)
    
  }
}

function loadDrawingAndInterface() {
  drawing = drawing_word
  currDrawing = drawingMap["Cri text"];
  calculateDrawingStatistics()
  setPictureCanvasParameters(currDrawing)
  loadUI()
  calculatePath()
}

function epicycles(x, y, rotation, fourier) {
  for (let i = 0; i < fourier.length; i++) {
    let prevx = x;
    let prevy = y;
    let freq = fourier[i].freq;
    let radius = fourier[i].amp;
    let phase = fourier[i].phase;
    x += radius * cos(freq * time + phase + rotation);
    y += radius * sin(freq * time + phase + rotation);

    if (radius > 1){
      strokeWeight(3);
      // Drawing circles
      if (drawCircles.checked()){ 
        stroke(120,100);
        noFill();
        ellipse(prevx, prevy, radius * 2); 
      }

      //Drawing lines
      stroke(220,200);
      line(prevx, prevy, x, y);
    }
  }
  return createVector(x, y);
}

function checkTimeStep() {
  if (time+dt >= TWO_PI || time < 0) {
    if (rewindDraw.checked()){
      dt = -dt
      time += dt
    } else {
      time = 0;
      if(dt < 0) dt = -dt
      path = []
    }
  }
}

function drawEyes() {
  if(currDrawing == drawingMap["Portrait"]) {
    if( eyesDraw[0] || prevRotationPercentage > 0.39) {
      let radius = 3
      beginShape();
  	  noFill();
  	  stroke(255);
  	  strokeWeight(3);
      for(let i=0; i<20; i++)
        vertex(centerLeftEye[0]+radius*cos(TWO_PI/20*i),centerLeftEye[1]+radius*sin(TWO_PI/20*i));
      endShape();
      eyesDraw[0] = true
    } 
    if(eyesDraw[1] || prevRotationPercentage > 0.61) {
      let radius = 3
      beginShape();
  	  noFill();
  	  stroke(255);
  	  strokeWeight(3);
      for(let i=0; i<30; i++)
        vertex(centerRightEye[0]+radius*cos(TWO_PI/30*i),centerRightEye[1]+radius*sin(TWO_PI/30*i));
      endShape();
      eyesDraw[1] = true
    }
  }
}

function checkPhase(){
  let currRotationPercentage = round(time/(TWO_PI),2);
  if(currRotationPercentage != prevRotationPercentage) {
    prevRotationPercentage = currRotationPercentage
  	currRotationPercentage = currRotationPercentage.toString()
  	if(currRotationPercentage.length < 4 && currRotationPercentage.length > 1) { 
  		currRotationPercentage = currRotationPercentage + "0"
  	}
  	mainPhaseLabel.html("Rotation = "+ currRotationPercentage);
  }
}


function draw() {
  if(frameCount % 30 == 0)
    checkDeviceRotation()
  background(0);
  if (STATE == INSERTING_PASSWORD) {
  	loadStart()
    if(PASSWORD_INCORRECT) { animatePasswordIncorrect() }

  } else if (STATE == AUTO_DRAWING) {
    translate(x_translate,y_translate)
    checkTimeStep()
   	path.unshift(epicycles(width / 2, height / 2, 0, fourierX));
   	beginShape();
  	noFill();
  	stroke(255);
  	strokeWeight(4);
    if (prevTrackingValue < 1) {
      var until = min(int(prevTrackingValue*(path.length)),int(prevTrackingValue*(x.length)))
    } else {
      var until = path.length;
    }
    for (let i = 0; i < until; i++) {
    	vertex(path[i].x, path[i].y);
  	}
  	endShape();

    drawEyes()

  	time += dt;
    if (path.length > x.length*3) path = path.slice(0,int(x.length*2+1))
  	checkPhase()

  }
}

function resetDraw(){
  time = 0;
  path = []
  prevRotationPercentage = 0
  eyesDraw = [false,false]
}

function mouseReleased(){
  if(STATE == AUTO_DRAWING) {
    speedSliderValue = speedSlider.value();
    if(prevSpeedValue != speedSliderValue){
    	prevSpeedValue = speedSliderValue;
      resetDraw();
     	calculatePath();
    }
  }
}

function checkDeviceRotation(){
  if ((windowWidth/windowHeight < 1 && ORIENTATION == LANDSCAPE) || (windowWidth/windowHeight > 1 && ORIENTATION == PORTRAIT)){
    removeElements()
    passwordInput = null
    resetDraw()
    setup()
    if(STATE == AUTO_DRAWING) {
      loadDrawingAndInterface()
    }
  }
}

function keyTyped(){
  if(STATE == INSERTING_PASSWORD && key == "Enter" && passwordInput.value().length > 0){
    try {
      password = stringToUInt32(passwordInput.value())
      drawing_word = decrypt_data(drawing_word,"f",password)
      drawing_portrait = decrypt_data(drawing_portrait,"i",password)
    } catch(error) { PASSWORD_INCORRECT = true }
    
    if(!PASSWORD_INCORRECT) {
      removeElements()
      loadDrawingAndInterface()
      STATE = AUTO_DRAWING
    }

  }
}

function animatePasswordIncorrect() {
  passwordInput.style("color:rgb(255,0,0); background-color:rgb(255,190,190)")
  let pos = passwordInput.position() 
  if (shaking_dir == null) shaking_dir = 14
  else if (pos.x > width/2 - passwordInput.size().width/2 + 42) shaking_dir = -14
  else if (pos.x < width/2 - passwordInput.size().width/2 - 42) shaking_dir = 0

  if (shaking_dir != 0)
    passwordInput.position(pos.x+shaking_dir,pos.y)
  else {
    passwordInput.position(width/2 - passwordInput.size().width/2,pos.y)
    passwordInput.style("color:rgb(0,0,0); background-color:rgb(255,255,255)")
    shaking_dir = null
    PASSWORD_INCORRECT = false
  }
}

function mouseDragged() {
  if(STATE == AUTO_DRAWING) {
    //speedSliderValue = speedSlider.value();
    //if(prevSpeedValue != speedSliderValue) {
    //	speedSliderLabel.html("Speed = " + speedSliderValue.toString())
    //}
    trackGhostSliderValue = trackGhostSlider.value()
    if(prevTrackingValue != trackGhostSliderValue) {
    	prevTrackingValue = trackGhostSliderValue
    	//trackGhostSliderLabel.html("Keep = " + prevTrackingValue.toString())
    }
  }
}

//function mouseClicked(){
//  if (STATE == START) {
//  	STATE = LOADING;
//  } else if (STATE == LOADING) {
//  	STATE = AUTO_DRAWING;
//  	resetDraw()
//  }
//}
