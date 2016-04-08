
var fallbackPort = 9000;
var port = process.env.PORT || fallbackPort;
var express = require('express');
var https = require('https');
var bodyParser = require('body-parser');
var decodejwt = require('./decodejwt.js');
var getAccessToken = require('./getAccessToken.js');
var getServiceData = require('./getServiceData.js');
var userProfile = require('./userProfile.js');
var cookieParser = require('cookie-parser');
var app = express();

app.use('/', express.static(__dirname + "/app"));
app.use('/bower_components', express.static(__dirname + "/bower_components"));
app.use(cookieParser());
app.use(bodyParser.json()); // for parsing application/json

app.get('/api/me', function(request, response) {
	
	var me = {
		name: "Test User",
		email: "rob@howard.cc",
		sendEmailSummaries: true,
		minimumMoistureReading: 75,
		onlyWaterWhenItsDry: true,
		skipWateringWhenItRains: true,
		currentTime: new Date()
	};
});

function catchCode(request, response, authConfig, scopes, resource) {
	
	var protocol = port == fallbackPort ? "http" : "https";
	
	var redirectUrl = protocol + '://' + request.get('host') + request.path;
	if (!request.query.code) {
		response.writeHead(302, {"Location": getAccessToken.getAuthorizationEndpointUrl(authConfig, redirectUrl, scopes, resource)});
		response.end();
	} else {
		
		var cookieUserId = request.cookies.userId;

		function updateUserInfo(userId, documentObject) {
			userProfile.updateUser(request, {}, function(error, results) {
				setCookieRedirectAndEndRequest(userId);
			});
		}
	
		function setCookieRedirectAndEndRequest(newUserIdCookieValue) {
			if (newUserIdCookieValue) {
				console.log("Setting cookie to: " + newUserIdCookieValue);
				response.cookie('userId', newUserIdCookieValue, { maxAge: 900000, httpOnly: true });
			}
			response.writeHead(302, {"Location": request.protocol + '://' + request.get('host') + '/#/home'});
			response.end();
		}
		
		getAccessToken.getTokenResponseWithCode(authConfig, request.query.code, redirectUrl, function(error, tokenResponseData) {
			if (error) {
				console.log("Error getting token response");
				response.writeHead(200, {"Content-Type": "text/plain"});
				response.write("Error: " + error);
				response.end();
			} else {
				console.log(tokenResponseData);
				var tokenResponse = JSON.parse(tokenResponseData);
				
				if (cookieUserId) {
					console.log("Found user id cookie");
					//replace the current user's aad user info with what we get back from catchcode
					updateUserInfo(cookieUserId, tokenResponse);
					setCookieRedirectAndEndRequest();
				} else {
					console.log("No user id cookie found");
					//try to find a current user with this id
					
					var idToken = decodejwt.decodeJwt(tokenResponse.id_token).payload;
		
					userProfile.lookupUser(request, idToken.oid, function(error, result) {
						if (result === undefined) {
							userProfile.insertUser(
								request,
								{
									aadId: idToken.oid,
									firstName: idToken.given_name,
									lastName: idToken.family_name,
									emailAddress: idToken.upn
								},
								function (error, results) {
									setCookieRedirectAndEndRequest(idToken.oid);
								});
						} else {
							updateUserInfo(idToken.oid, tokenResponse);
						}
					});
				}
			}
		});
	}
}

app.get('/catchCode', function(request, response) {
	catchCode(request, response, "AAD", null, "https://outlook.office365.com");
});

console.log("Starting server on port " + port + "...");
app.listen(port);