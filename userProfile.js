module.exports = {
	getCurrentUser: getCurrentUser,
	updateUser: updateUser,
	lookupUser: lookupUser,
	insertUser: insertUser
};

function lookupUser(request, aadId, callback) {
	request.db.query('SELECT * from user WHERE aadId='+request.db.escape(aadId), function(error, rows) {
		if(error) {
			console.error('error: ' + error.stack);
			callback(error);
		}
		callback(null, rows[0]);
	});
}

function insertUser(request, user, callback) {
	request.db.query("INSERT INTO user (aadId, firstName, lastName, emailAddress) VALUES ('" + user.aadId + "', '" + user.firstName + "', '" + user.lastName + "', '" + user.emailAddress + "')", function(error, rows) {
		if(error) {
			console.error('error: ' + error.stack);
			callback(error);
		}
		callback(null, rows[0]);
	});
}

function getUserIdFromRequest(request) {
	return request.cookies.userId;
}

function updateUser(request, properties, callback) {
	var userId = getUserIdFromRequest(request);
	
	if (userId) {
		console.log("current user id found");
		updateUserInDataSource(request, userId, callback);
	} else {
		callback(null, null);
	}
}

function getCurrentUser(request, callback) {
	var userId = getUserIdFromRequest(request);
	
	if (userId) {
		console.log("current user id found");
		getUserFromDataStore(request, userId, callback);
	} else {
		callback(null, null);
	}
}

function getUserFromDataStore(request, aadId, callback) {
		request.db.query('SELECT TOP 1 * from user WHERE aadId='+request.db.escape(aadId), function(err,rows){
		if(err) {
				console.error('error:' + err.stack);
				callback(err);
		}
		callback(null,rows);
	});
}

function updateUserInDataSource(request, userId, callback) {
	//need to determine where we are getting the update from
	
}