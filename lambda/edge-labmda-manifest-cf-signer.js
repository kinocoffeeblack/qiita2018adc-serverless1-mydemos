const aws = require('aws-sdk');
const s3 = new aws.S3({
  apiVersion: '2006-03-01'
});
const backetName = 'S3バケット名';

// Lambda@Edgeのソース
// CloudFrontのビヘイビア(Behaviors)で"*.m3u8"のリクエストだけをこのLambdaに処理させる
exports.lambdaHandler = async (event, context, callback) => {
  const request = event.Records[0].cf.request;
  // uriの先頭の"/"をとってS3オブジェクトのkey名を取得("hls/xxx.m3u8"のようになるはず)
  const key = request.uri.substring(1);
  console.log("s3 object key is :", key);
  const s3Params = {
      Bucket: backetName,
      Key: key
  };
  // 素のマニフェストファイルの内容をS3バケットから取得
  const s3Res = await s3.getObject(s3Params).promise();
  const srcBody = s3Res.Body.toString('utf-8');

  // 自分のリクエストに付与された署名パラメータをファイル内の参照にも付与（書き換え処理）
  const qs = request.querystring;
  const signedBody = srcBody.replace(/\.m3u8/g, `.m3u8?${qs}`).replace(/\.ts/g, `.ts?${qs}`);

  // content-typeとCORS用のResposeヘッダを付与
  const response = {
    status: 200,
    statusDescription: 'OK',
    headers: {
      'content-type': [{
        key: 'Content-Type',
        value: 'application/x-mpegURL'
      }],
      'access-control-allow-methods': [{
        key: 'Access-Control-Allow-Methods',
        value: 'GET,HEAD'
      }],
      'access-control-allow-origin': [{
        key: 'Access-Control-Allow-Origin',
        value: '*'
      }]
    },
    body: signedBody,
  };
  callback(null, response);
};