var https = require('https');

var authConfigs = {
	AAD: {
		stsTokenPath: "/common/oauth2/token",
		stsAuthorizationPath: "/common/oauth2/authorize",
		stsHostName: "login.microsoftonline.com",
		clientId: "f2a72c77-d6ad-42fd-800b-7c8a2ad068b0",
		clientSecret: "ADJYXBqwDR2tJK16jceivZ8"
	}
};

module.exports = {
  getAuthorizationEndpointUrl: function (authConfigName, redirectUri, scopes, resource) {
    var authConfig = authConfigs[authConfigName];
    var basicUrl = "https://" + authConfig.stsHostName + authConfig.stsAuthorizationPath + "?client_id=" + authConfig.clientId + "&response_type=code&redirect_uri=" + redirectUri; 
    if (scopes) {
      basicUrl += "&scope=" + scopes;
    }
    if (resource) {
      basicUrl += "&resource=" + resource;
    }
    return basicUrl; 
  },
  getTokenResponseWithRefreshToken: function (authConfigName, refreshToken, redirectUri, callback) {
    var authConfig = authConfigs[authConfigName];
    makeRefreshTokenRequest(authConfig, refreshToken, redirectUri, callback);
  },
  getTokenResponseWithCode: function (authConfigName, code, redirectUri, callback) {
    var authConfig = authConfigs[authConfigName];
    makeTokenRequest(authConfig, constructBaseTokenRequestBody(authConfig, redirectUri) + "&grant_type=authorization_code&code=" + code, callback);
  },
  refreshAccessTokensIfNecessary: refreshTokensIfNecessary
};

function refreshTokensIfNecessary(user, callback) {
  var completedCalls = 0;
  makeRefreshTokenRequest(authConfigs.AAD, user.aadTokens.refreshToken, null, function(error, tokenResponseData) {
    completedCalls++;
    var tokenResponse = JSON.parse(tokenResponseData);
    user.aadTokens.accessToken = tokenResponse.access_token;
    if (completedCalls == 2) callback();
  });
  makeRefreshTokenRequest(authConfigs.MSA, user.msaTokens.refreshToken, null, function(error, tokenResponseData) {
    completedCalls++;
    var tokenResponse = JSON.parse(tokenResponseData);
    user.msaTokens.accessToken = tokenResponse.access_token;
    if (completedCalls == 2) callback();
  });
}

function makeRefreshTokenRequest(authConfig, refreshToken, redirectUri, callback) {
  makeTokenRequest(authConfig, constructBaseTokenRequestBody(authConfig, redirectUri) + "&grant_type=refresh_token&refresh_token=" + refreshToken, callback);
}

function constructBaseTokenRequestBody(authConfig, redirectUri) {
  var baseRequest = "client_id=" + authConfig.clientId + "&client_secret=" + authConfig.clientSecret;
  if (redirectUri) baseRequest += "&redirect_uri=" + redirectUri;
  return baseRequest;
}

function makeTokenRequest(authConfig, requestBody, callback) {
  var options = {
    hostname: authConfig.stsHostName,
    path: authConfig.stsTokenPath,
    method: "POST",
    port: 443,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': requestBody.length
    }
  };
  var tokenResponseData = "";
  var tokenRequest = https.request(options, function(tokenResponse) {
    tokenResponse.on("error", function(error) {
      console.log(error.message);
    });
    tokenResponse.on("data", function(data) {
      tokenResponseData += data.toString();
    });
    tokenResponse.on("end", function() {
      callback(null, tokenResponseData);
    });
  });
  tokenRequest.write(requestBody);
  tokenRequest.end();
};
