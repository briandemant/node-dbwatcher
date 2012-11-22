"use strict";
var inspect = require('util').inspect;
var Client = require('mariasql');
var async = require('async');

var conn = new Client();
var cfg = require('./config.json');
conn.connect(cfg["mysql"]);

conn.on('connect', function () {
	console.log('Client connected');
});

conn.on('error', function (err) {
	console.log('Client error: ' + err);
});

conn.on('close', function (hadError) {
	console.log('Client closed');
});

var tables = [];
var tblRes = conn.query('SHOW TABLES');
tblRes.on('result', function (res) {

	res.on('row', function (row) {
		var table = row[Object.keys(row)[0]];
		console.log('Checking table: ' + table);
		tables.push(new TableInfo(table));
	})
	res.on('error', function (err) {
		console.log('Result error: ' + inspect(err));
	});
	res.on('end', function (info) {
		console.log('Ready to check');

	});
})
tblRes.on('end', function () {
	checkTables(tables);
});


function checkTable(table, cb) {
	var tblRes = conn.query('select avg(id) as avg_id,avg(updated_at) as avg_ts,count(*) as count from ' + table.name);
	tblRes.on('result', function (res) {
		var result = null;
		res.on('row', function (row) {
			result = row;
		});
		res.on('error', function (err) {
			cb(err);
		});
		res.on('end', function (err) {
			cb(null, result);
		});
	})
}
function checkTables(tables) {
	async.map(tables, checkTable, function (err, results) {
		console.log("got data");

		tables.forEach(function compareValues(table, idx) {
			console.log(table.name);
			var result = results[idx];
			var changed = false;
			Object.keys(result).forEach(function copy(key) {
				if (table[key] != result[key]) {
					changed = true;
					console.log("   " + key + "   changed from " + table[key] + " to " + result[key]);
				}
				table[key] = result[key];
			});
			if (!changed) {
				console.log("   no change");
			}
		});


		setTimeout(function () {
			console.log("======================");
			checkTables(tables);
		}, 2000);
	});
}

function TableInfo(table) {
	this.name = table;
	this.lastChecked = null;
}