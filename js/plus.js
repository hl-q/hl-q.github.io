//Dirty code. Don't judge :p

var camera, scene;
var videoCamera, videoScene;
var videoTexture;
var renderer;

var video = document.getElementById('webcam');
var videoCanvas = document.getElementById('videoCanvas');
var videoCtx = videoCanvas.getContext('2d');

var width = videoCanvas.width;
var height = videoCanvas.height;

var card;
var tagSizeDelta = 0;
var tagSize = 33.3;

var started = false;
var tagMap = THREE.ImageUtils.loadTexture('/img/silhouette.png');
var tagCovers = [];

var photos = [];

function setCameraMatrix() {
    var far = 1000;
    var near = 10;
    var m = Chilitags.getCameraMatrix();
    camera.projectionMatrix.set(
            2*m[0]/width,              0,        2*m[2]/width-1,  0,
            0, -2*m[4]/height,    -(2*m[5]/height-1),  0,
            0,              0, (far+near)/(far-near), -2*far*near/(far-near),
            0,              0,                     1,  0
            );
}

function init() {
    var tagConfig = '%YAML:1.0\n';
    tagConfig += 'face:\n';
    for (var i=0; i<=170; i++) {
        tagConfig += '  - tag: '+(4*i  )+'\n';
        tagConfig += '    size: 33.3\n';
        tagConfig += '    translation: [-33.3, -33.3, 0.]\n';
        tagConfig += '  - tag: '+(4*i+1)+'\n';
        tagConfig += '    size: 33.3\n';
        tagConfig += '    translation: [ 33.3, -33.3, 0.]\n';
        tagConfig += '  - tag: '+(4*i+2)+'\n';
        tagConfig += '    size: 33.3\n';
        tagConfig += '    translation: [ 33.3,  33.3, 0.]\n';
        tagConfig += '  - tag: '+(4*i+3)+'\n';
        tagConfig += '    size: 33.3\n';
        tagConfig += '    translation: [-33.3,  33.3, 0.]\n';
    }
    FS.createDataFile("/", "tagConfig.yml",tagConfig, true, true);
    Module.ccall('readTagConfiguration', 'void', ['string', 'boolean'], ["/tagConfig.yml", true]);
    Chilitags.set3DFilter(5, 0.0);

    scene = new THREE.Scene();

    card = new THREE.Object3D();
    card.matrixAutoUpdate = false;
    var corners = [
        [-33.3, -33.3],
        [ 33.3, -33.3],
        [-33.3,  33.3],
        [ 33.3,  33.3]
    ];
    for (var i = 0; i<4; i++) {
        tagCovers[i] = new THREE.Mesh(
                new THREE.PlaneGeometry(tagSize+tagSizeDelta, tagSize+tagSizeDelta),
                new THREE.MeshBasicMaterial(
                    {map: tagMap,
                     overdraw: true,
                     transparent: true,
                     opacity: 0,
                     side:THREE.DoubleSide
                     }));
        tagCovers[i].position.x = (tagSize)/2+corners[i][0];
        tagCovers[i].position.y = (tagSize)/2+corners[i][1];
        tagCovers[i].rotation.x = Math.PI;
        card.add(tagCovers[i]);
        scene.add(card);
    }

    camera = new THREE.Camera();
    setCameraMatrix();
    scene.add(camera);

    var photoFiles = [
        '/img/slide1.jpg',
        '/img/slide2.jpg',
        '/img/slide3.jpg',
        '/img/slide4.jpg',
        '/img/slide5.jpg',
        '/img/slide6.jpg',
        '/img/slide7.jpg',
        '/img/slide8.jpg',
        '/img/slide9.jpg',
        '/img/slide10.jpg'
        ];
    var photoWidth = 135;
    var photoHeight = photoWidth*3/4;
    //var photoHeight = 130;
    //var photoWidth = photoHeight*4/3;
    for (var i = 0; i<photoFiles.length; i++) {
        photos[i] = new THREE.Mesh(
            new THREE.PlaneGeometry(photoWidth, photoHeight),
            new THREE.MeshBasicMaterial(
                {map: THREE.ImageUtils.loadTexture(photoFiles[i]),
                 overdraw: true,
                 transparent: true,
                 opacity: 0,
                 side:THREE.DoubleSide
                 }));
        photos[i].position.x = tagSize/2;
        photos[i].position.y = tagSize/2;
        photos[i].rotation.x = Math.PI;
        card.add(photos[i]);
    }

    videoScene = new THREE.Scene();
    videoCamera = new THREE.OrthographicCamera(-width/2, width/2, height/2, -height/2, 1, 1000);
    videoCamera.position.x = 0;
    videoCamera.position.y = 0;
    videoCamera.position.z = 0;
    videoCamera.lookAt({x:0, y:0, z:-50});

    videoTexture = new THREE.Texture(videoCanvas);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    var plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height, 1, 1), new THREE.MeshBasicMaterial({map: videoTexture, overdraw: true, side:THREE.DoubleSide}));
    plane.position.x = 0;
    plane.position.y = 0;
    plane.position.z = -50;
    plane.material.depthTest = false;
    plane.material.depthWrite = false;
    videoScene.add(plane);
    videoScene.add(videoCamera);


    var hasCanvas = !! window.CanvasRenderingContext2D;
    var hasWebGL = ( function () { try {
            var canvas = document.createElement( 'canvas' );
            return !! window.WebGLRenderingContext && (
                canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) );
            } catch( e ) { return false; } } )();

    if (hasWebGL) {
        renderer = new THREE.WebGLRenderer({antialias: true});
    }
    else {
        renderer = new THREE.CanvasRenderer();
    }
    renderer.setSize(width, height);

    var threeRenderer = document.getElementById('threeRenderer');
    threeRenderer.appendChild(renderer.domElement);

    renderLoop();
}

function renderLoop() {
    TWEEN.update();

    //Work around Firefox's bug 879717
    var videoIsReady = false;
    while (!videoIsReady) {
        try {
            videoCtx.drawImage(video, 0, 0, width, height);
            videoIsReady = true;
        } catch (e) {
            if (e.name.indexOf("NS_ERROR_NOT_AVAILABLE") == -1) throw e;
        }
    }
    videoTexture.needsUpdate = true;

    var estimations = Chilitags.estimate(videoCanvas, false);
    if ("face" in estimations) {
        card.updateMatrix();
        card.matrix.set.apply(card.matrix, estimations["face"]);

        if (!started) {
            started = true;
            var animations = [];
            for (var i = 0; i<4; i++) {
                animations.push(
                    new TWEEN.Tween(tagCovers[i].material)
                        .to({opacity: 1}, 1000 )
                        .easing(TWEEN.Easing.Linear.None)
                    );
            }

            //TODO https://github.com/abrie/devderby-may-2013-technical/blob/example_7/arview.js#L90
            for (var i = 0; i<photos.length; i++) {

                var jumpDuration = 2000;
                var showDuration = 3000;

                var climax = -150;
                photos[i].position.y = 0+tagSize/2;
                photos[i].position.z = 1;
                var fadeIn = new TWEEN.Tween(photos[i].material)
                    .to({opacity: 1}, 0 )
                    .easing(TWEEN.Easing.Cubic.Out);
                var up = new TWEEN.Tween(photos[i].position)
                    .to({y: climax+tagSize/2, z: -1}, jumpDuration*1/5 )
                    .easing(TWEEN.Easing.Cubic.Out);
                var down = new TWEEN.Tween(photos[i].position)
                    .to({y: 0+tagSize/2, z: -2}, jumpDuration*4/5 )
                    .easing(TWEEN.Easing.Elastic.Out);
                var hide = new TWEEN.Tween(photos[i].position)
                    .to({z:-1}, showDuration )
                    .easing(TWEEN.Easing.Quintic.In);
                var fadeOut = new TWEEN.Tween(photos[i].material)
                    .to({opacity: 0}, 0 )
                    .easing(TWEEN.Easing.Cubic.Out);
                //up.onStart(fadeIn.start)
                animations.push(fadeIn);
                animations.push(up);
                animations.push(down);
                animations.push(hide);
                //animations.push(fadeOut);
                //hide.onComplete(fadeOut.start)
            }

            for (var i = 0; i<animations.length-1; i++) {
                animations[i].chain(animations[i+1]);
            }
            animations[animations.length-1].chain(animations[4]);
            animations[0].start();
        }
    }

    renderer.autoClear = false;
    renderer.clear();
    renderer.render(videoScene, videoCamera);
    renderer.render(scene, camera);

    requestAnimationFrame( renderLoop );
}

window.URL = window.URL || window.webkitURL;
navigator.getUserMedia  = navigator.getUserMedia
|| navigator.webkitGetUserMedia
|| navigator.mozGetUserMedia
|| navigator.msGetUserMedia;

navigator.getUserMedia({video: true}, function(stream) {
        video.src = window.URL.createObjectURL(stream);
        localMediaStream = stream;
        video.play();
        }, function() {alert('Failed to open video.')});

//the timeOut is a work around Firefox's bug 879717
video.addEventListener('play', function() {setTimeout(init, 2500);}, false);
