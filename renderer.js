
/**
 ============================================================================
 Name        : scripts.js
 Author      : Ibrahim Mohamed
 Version     : 1.0
 Description : Video Call logic file
 ============================================================================
 **/


/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */



// Initiate a client with agora using RTC mode and VP8 video codec
let client = AgoraRTC.createClient({mode:'rtc', codec:"vp8"})

// set the configurations
let config = {
    appid:'fb39e319aa6243b9a98ec016647916d8',           // meeting ID
    token:'007eJxTYLg0999Uh+7Np8OYq07sPSR5+WRo1tXEOfntQVvZ4nZ0Gj9WYDA3Mk5JNUgzT0s2NDJJMkmxME1OTjEyt0g0NDUySDGwPH1RIdlHWSl589xyFkYGCATxuRhyMstSi0uKUhNzGRgA2X8keg==', // Meeting Token
    uid:null,               // user if
    channel:'livestream',   // meeting channel
}

// Setting tracks for when user joins
let localTracks = {
    audioTrack:null,
    videoTrack:null
}

/**
 *  tracks to hold state for users audio and video
 *  these are used for mute or hide
 **/

let localTrackState = {
    audioTrackMuted:false,
    videoTrackMuted:false
}

// Set remote tracks to store other users
let remoteTracks = {}


// get the buttons we have in variables
let joinBtn = document.getElementById('join-btn'),
    micBtn = document.getElementById('mic-btn'),
    cameraBtn = document.getElementById('camera-btn'),
    leaveBtn = document.getElementById('leave-btn')


// when join button is pressed
joinBtn.addEventListener('click', async () => {
    config.uid = document.getElementById('username').value  // get the id from the user
    await joinStreams() // apply join function
    document.getElementById('join-wrapper').style.display = 'none'  // make the join disappear
    document.getElementById('footer').style.display = 'flex'        // make the footer appear
})

// when mic button is pressed
micBtn.addEventListener('click', async () => {

    //Check what the state of muted currently is
    if(!localTrackState.audioTrackMuted){
        //Mute your audio
        await localTracks.audioTrack.setMuted(true);
        localTrackState.audioTrackMuted = true
        micBtn.style.backgroundColor ='rgb(197, 0, 0)'      // set mic button to red
    }else{
        // open your mic
        await localTracks.audioTrack.setMuted(false)
        localTrackState.audioTrackMuted = false
        micBtn.style.backgroundColor ='#1f1f1f8e'           // set mic button to default
    }
})

// when camera button is pressed
cameraBtn.addEventListener('click', async () => {
    //Check if what the state of camera currently is
    if(!localTrackState.videoTrackMuted){
        //hide your camera
        await localTracks.videoTrack.setMuted(true);
        localTrackState.videoTrackMuted = true
        cameraBtn.style.backgroundColor ='rgb(197, 0, 0)'   // set camera button to red
    }else{
        // open your camera
        await localTracks.videoTrack.setMuted(false)
        localTrackState.videoTrackMuted = false
        cameraBtn.style.backgroundColor ='#1f1f1f8e'        // set camera button to default
    }

})


// when leave button is pressed
leaveBtn.addEventListener('click', async () => {
    // Loop threw local tracks and stop them so unpublished event gets triggered, then set to undefined
    // Hide footer
    for (trackName in localTracks){
        let track = localTracks[trackName]
        if(track){
            track.stop()
            track.close()
            localTracks[trackName] = null
        }
    }
    await client.leave()         //Leave the channel
    document.getElementById('footer').style.display = 'none'
    document.getElementById('user-streams').innerHTML = ''
    document.getElementById('join-wrapper').style.display = 'block'
})




//function that takes all info and set user stream in frame
let joinStreams = async () => {

    client.on("user-published", handleUserJoined);      // when user joins
    client.on("user-left", handleUserLeft);             // when user leaves


    client.enableAudioVolumeIndicator();                // Triggers the "volume-indicator" callback event every two seconds.
    client.on("volume-indicator", function(evt){
        for (let i = 0; evt.length > i; i++){
            let speaker = evt[i].uid
            let volume = evt[i].level
            if(volume > 0){
                document.getElementById(`volume-${speaker}`).src = './assets/volume-on.svg'
            }else{
                document.getElementById(`volume-${speaker}`).src = './assets/volume-off.svg'
            }
        }
    });

    // Set and get back tracks for local user
    [config.uid, localTracks.audioTrack, localTracks.videoTrack] = await  Promise.all([
        client.join(config.appid, config.channel, config.token ||null, config.uid ||null),
        AgoraRTC.createMicrophoneAudioTrack(),
        AgoraRTC.createCameraVideoTrack()

    ])

    // Create player and add it to player list
    let player = `<div class="video-containers" id="video-wrapper-${config.uid}">
                        <p class="user-uid"><img alt="volume" class="volume-icon" id="volume-${config.uid}" src="./assets/volume-on.svg" /> ${config.uid}</p>
                        <div class="video-player player" id="stream-${config.uid}"></div>
                  </div>`

    document.getElementById('user-streams').insertAdjacentHTML('beforeend', player); // Play user stream in div

    localTracks.videoTrack.play(`stream-${config.uid}`)          // Add user to user list of names/ids

    await client.publish([localTracks.audioTrack, localTracks.videoTrack]) // Publish local video tracks to entire channel so everyone can see it

}


let handleUserJoined = async (user, mediaType) => {

    remoteTracks[user.uid] = user // Add user to list of remote users


    await client.subscribe(user, mediaType)// Subscribe ro remote users


    if (mediaType === 'video'){
        let player = document.getElementById(`video-wrapper-${user.uid}`)
        console.log('player:', player)
        if (player != null){
            player.remove()
        }

        player = `<div class="video-containers" id="video-wrapper-${user.uid}">
                        <p class="user-uid"><img alt="Volume On" class="volume-icon" id="volume-${user.uid}" src="./assets/volume-on.svg" /> ${user.uid}</p>
                        <div  class="video-player player" id="stream-${user.uid}"></div>
                      </div>`
        document.getElementById('user-streams').insertAdjacentHTML('beforeend', player);
        user.videoTrack.play(`stream-${user.uid}`)
    }


    if (mediaType === 'audio') {
        user.audioTrack.play();
    }
}


let handleUserLeft = (user) => {
    console.log('Handle user left!')
    delete remoteTracks[user.uid]                           //Remove from remote users and remove users video wrapper
    document.getElementById(`video-wrapper-${user.uid}`).remove()
}


