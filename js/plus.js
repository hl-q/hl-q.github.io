//Dirty code. Don't judge :p

var camera, scene;
var renderer;

var video = document.getElementById('webcam');
var width = video.width;
var height = video.height;

var card;
var tagSizeDelta = 0;
var tagSize = 33.3;

var started = false;
var tagMap = THREE.ImageUtils.loadTexture('/img/silhouette.png');
var tagCovers = [];

var photos = [];

var stats = {};
stats.screenWidth = screen.width;
var detectionTime = new Date();
var renderTime = new Date();

function setCameraMatrix(m) {
    var far = 1000;
    var near = 10;
    camera.projectionMatrix.set(
            2*m[0]/width,              0,        2*m[2]/width-1,  0,
            0, -2*m[4]/height,    -(2*m[5]/height-1),  0,
            0,              0, (far+near)/(far-near), -2*far*near/(far-near),
            0,              0,                     1,  0
            );
}

function init() {
    Paprika.start(undefined, video, false);
    stats.videoStarted = true;
    cardBundle = {};
    for (var i=0; i<=170; i++) {
        cardBundle[(4*i+0)] = {size: 33.3, keep: 1, translation: [-33.3, -33.3, 0.]};
        cardBundle[(4*i+1)] = {size: 33.3, keep: 1, translation: [ 33.3, -33.3, 0.]};
        cardBundle[(4*i+2)] = {size: 33.3, keep: 1, translation: [ 33.3,  33.3, 0.]};
        cardBundle[(4*i+3)] = {size: 33.3, keep: 1, translation: [-33.3,  33.3, 0.]};
    }
    Paprika.getCamera(setCameraMatrix);
    Paprika.set3DFilter(5, 0.0);
    Paprika.bundleTags({card: cardBundle});
    Paprika.onTagUpdate(update);

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

    var hasCanvas = !! window.CanvasRenderingContext2D;
    stats.hasCanvas = hasCanvas;
    var hasWebGL = ( function () { try {
            var canvas = document.createElement( 'canvas' );
            return !! window.WebGLRenderingContext && (
                canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) );
            } catch( e ) { return false; } } )();
    stats.hasWebGL = hasWebGL?true:false;

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

function update(estimations) {
    var endTime = new Date();
    stats.detectionTime = (endTime.getTime() - detectionTime.getTime())
    detectionTime = endTime;
    stats.tags = "";
    for (k in estimations) stats.tags += k;
    if ("card" in estimations) {
        card.updateMatrix();
        card.matrix.set.apply(card.matrix, estimations["card"]);

        if (!started) {
            stats.animationStarted = true;
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
}

function renderLoop() {
    var endTime = new Date();
    stats.renderTime = (endTime.getTime() - renderTime.getTime())
    renderTime = endTime;

    TWEEN.update();

    renderer.autoClear = false;
    renderer.clear();
    renderer.render(scene, camera);

    requestAnimationFrame( renderLoop );
}

function setContentHeight() {
    var arcontainer = $('.hlq-ar-container');
    var arparent = arcontainer.parent();
    var containerWidth = arparent.width();
    if (containerWidth < 640) {
        var scale = containerWidth/640;
        arcontainer.css("transform", "scale("+scale+")");
        arcontainer.css("margin-left",   "-"+((1-scale)*(arparent.width() +30)/2+15)+"px");
        arcontainer.css("margin-top",    "-"+((1-scale)*(arparent.height()+30)/2+15)+"px");
        arcontainer.css("margin-bottom", "-"+((1-scale)*(arparent.height()+30)/2-15)+"px");
        
    }
}
$(window).resize(setContentHeight);
setContentHeight();

init();
