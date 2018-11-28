import React, { Component } from 'react';
import './App.css';

import Amplify, { API } from 'aws-amplify';
import Hls from 'hls.js'

const REGION = 'yourRegion';
const ENDPOINT_NAME = 'DemoWebBackend';
const ENDPOINT = 'https://XXXXXXXX.execute-api.yourRegion.amazonaws.com';
const IDENTITYPOOL_ID = 'your identity pool id';
const APIKEY = 'your api key';
Amplify.configure({
  Auth: {
    region: REGION, // REQUIRED
    identityPoolId: IDENTITYPOOL_ID, // REQUIRED
    mandatorySignIn: false
  },
  API: {
    endpoints: [
      {
        name: ENDPOINT_NAME,
        endpoint: ENDPOINT,
        region: REGION,
        custom_header: async () => { return { 'x-api-key': APIKEY } }
      }
    ]
  }
});

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      movieUrl: null
    }
  }

  onClickIssueSignedUrl = async () => {
    const baseFileName = 'D0002040064_00000_V_000';
    const path = `/prod/signedurl-demo/${baseFileName}`;
    try {
      const resBody = await API.get(ENDPOINT_NAME, path);
      // console.log('resBody:', resBody);
      this.setState({ movieUrl: resBody.signedManifestUrl });
    } catch (err) {
      console.log(err);
      if (err.response) {
        alert('署名付きURLの生成に失敗しました。status:', err.response.status);
      } else {
        // CORSエラー(403)や不正なURL(404)など、サーバ側処理まで到達できていない場合はstatusCodeが設定されない
        alert('署名付きURLの生成に失敗しました。');
      }
    }
  };

  render() {
    return (
      <div className="App">
        <p>This is DemoApp for <a href="https://qiita.com/advent-calendar/2018/serverless" target="_qiitaWindow">Serverless1 QiitaAdventCalendar2018</a> 1st day.
        </p>
        <video id="video" width="370" controls src="https://qiita2018adcdemo-movies.apps.kinocoffeeblack.net/hls/D0002040064_00000_V_000.m3u8"></video>
        <ButtonBlock onIssueExecute={this.onClickIssueSignedUrl} issued={this.state.movieUrl !== null} />
        <SignedUrlBlock singedUrl={this.state.movieUrl} />
      </div>
    );
  }
}

const ButtonBlock = ({issued, onIssueExecute}) => {
  if (issued) return null;
  return (
    <div className="buttonBlock">
      <button className="btn btn btn-outline-success" onClick={onIssueExecute}>Issue SignedURL for Streaming</button>
    </div>
  );
};

const SignedUrlBlock = ({singedUrl}) => {
  if (!singedUrl) return (
    <span>署名付きURLでない場合(初期状態)は再生できませんが...</span>
  );

  var video = document.getElementById('video');
  if(Hls.isSupported()) {
    var hls = new Hls();
    hls.loadSource(singedUrl);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, function() {
      console.log("MANIFEST_PARSED (in Hls.isSupported)");
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = singedUrl;
    video.addEventListener('loadedmetadata',function() {
      console.log("MANIFEST_PARSED");
    });
  }

  return (
    <div className="hlsMovieBlock">
      <span className="small">※元動画は<a href="http://www2.nhk.or.jp/archives/creative/material/view.cgi?m=D0002040064_00000" target="_nhk">NHKCreativeLibrary</a>より</span>
      <h5>CloudFront SignedUrl Issued!</h5>
      <div className="singedUrl border border-dark">{singedUrl}</div>
    </div>
  );
};

export default App;
