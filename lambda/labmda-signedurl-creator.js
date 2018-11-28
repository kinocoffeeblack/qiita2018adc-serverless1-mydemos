const aws = require('aws-sdk');

const keypairId = 'CloudFrontのキーペアのID';
const privateKey = `-----BEGIN RSA PRIVATE KEY-----
// CloudFrontのキーペアprivateKeyの中身（もちろんQiitaやgithubで公開なんかしない）
// 環境変数に設定してKMSで暗号化したほうがよさそう
-----END RSA PRIVATE KEY-----
`;
const signer = new aws.CloudFront.Signer(keypairId, privateKey);

// CloudFrontDomain
const CF_DOMAIN = '動画配信URLのドメイン';
// 有効期限(秒) 3分
const EXPIRE_MS = 3 * 60 * 1000;

exports.lambdaHandler = async (event, context) => {
  const baseFileName = event.pathParameters.baseFileName;
  const signedUrl = await getSignedUrlAsync(baseFileName);
  // policyの作成ように使ったURLのワイルドカード部をマニフェストファイルへの参照用に変更する
  const signedManifestUrl = signedUrl.replace(/\*\?/, `.m3u8?`)

  const resbody = {
    signedManifestUrl
  };

  const res = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(resbody)
  };
  return res;
};

const getSignedUrlAsync = (baseFileName) => {
  // baseFileNameの後ろが何でも適用できるワイルドカードのURL指定のカスタムポリシーを生成
  const wildcardUrl = `https://${CF_DOMAIN}/hls/${baseFileName}*`;
  // 署名の有効期限を設定
  const expiresUtcUnix = getExpireUtcUnixTimestamp(EXPIRE_MS);
  console.log('expiresUtcUnix:', expiresUtcUnix);
  const policy = createPolicy(wildcardUrl, expiresUtcUnix);
  // signerにpromiseを返してくれるメソッドが無いようなので自分で作る(async, awaitできるように)
  return new Promise((resolve, reject) => {
    const options = {
      url: wildcardUrl,
      policy: JSON.stringify(policy)
    }
    // SDKを使用して署名付きURLの生成
    signer.getSignedUrl(options, (err, url) => {
      if (err) {
        console.log(err);
        reject(err);
      }
      resolve(url);
    });
  });
};

const createPolicy = (url, expiresUtcUnix) => {
  return {
    "Statement": [{
      "Resource": url,
      "Condition": {
        "DateLessThan": {
          "AWS:EpochTime": expiresUtcUnix
        }
      }
    }]
  }
};

const getExpireUtcUnixTimestamp = (millSec) => {
  // cloudfrontのjsライブラリのexpiresはUNIXエポック時間で指定する必要があるらしい
  // ライブラリのmomentを使えばもっと簡単にできる( moment().utc().add(3, 'minutes').unix(); のように)
  // が、aws-sdkのrequireだけでやりたかったので面倒だが同じ結果を得れる実装で
  const now = new Date();
  const utcTimestamp = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
  const expireTimestamp = utcTimestamp + millSec;
  return Math.floor(expireTimestamp / 1000);
};