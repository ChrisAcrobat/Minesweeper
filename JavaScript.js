'use strict'
var wrapper;
var inputWidth;
var inputHeight;
var inputPopulation;
var inputPlayerName;
var inputTimePerPlayer;
var gameboard;
var width;
var height;
var population;
var minefield;
var totalNumberOfMines;
var timeStarted;
var checkboxQuickGame;
var tableTopPlays;
var multiplayerPlayTime;	// Milliseconds
var players;
var tableLosses;
var listOfCells;
var playerRowList;

var isMultiplayer = false;
var topPlays = 10;
var topPlaysArray = Array();
var isFinnished = true;
var SEPERATOR = '$';
var playerNamesHistory = '';

// Pre-init
let postManager = new PostManager();

function onload(inputMode)
{
	wrapper = document.getElementById('wrapper');
	window.onresize = resizeScreen;

	if(inputMode === 'LOCAL_HIGESCORE' || inputMode === 'GLOBAL_HIGESCORE')
	{
		if(inputMode === 'LOCAL_HIGESCORE')
		{
			getStoredTables();
			createTables();
		}
		else
		{
			fetchTablesFromDatabase();
		}
	}
	else
	{
		if(inputMode !== undefined)
		{
			isMultiplayer = inputMode === 'MULTIPLAYER';
		}

		document.onkeydown = keyPress;
		inputWidth = document.getElementById('boardWidth');
		inputHeight = document.getElementById('boardHeight');
		inputPopulation = document.getElementById('boardPopulation');
		inputPlayerName = document.getElementById('playerName');
		inputTimePerPlayer = document.getElementById('timePerPlayer');
		checkboxQuickGame = document.getElementById('quickGame');
		tableTopPlays = document.getElementById('topPlays');
		tableLosses = document.getElementById('tableLosses');
		playerRowList = document.getElementById('players');

		if(!isMultiplayer)
		{
			document.getElementById('topPlaysNumber').innerHTML = topPlays;
		}

		var width = getStoredValue('width');
		if(width !== '')
		{
			inputWidth.value = width;
		}

		var height = getStoredValue('height');
		if(height !== '')
		{
			inputHeight.value = height;
		}

		var population = getStoredValue('population');
		if(population !== '')
		{
			inputPopulation.value = population;
		}

		checkboxQuickGame.checked = getStoredValue('quickGame') === 'true';

		var lastPlayer = isMultiplayer ? getStoredValue('multiplayerNames') : getStoredValue('lastPlayer');
		if(lastPlayer !== '')
		{
			inputPlayerName.value = lastPlayer;
		}

		generate();
	}
}

function keyPress()
{
	switch(event.keyCode)
	{
		case 32:	// Space
			if(isFinnished)
			{
				generate();
			}
			break;

		case 116:	// F5 button
			generate();
			event.returnValue = false;
			return false;

		case 82:	// R button
			if(event.ctrlKey)
			{
				generate();
				event.returnValue = false;
				return false;
			}
	}
}

function savePlayerName()
{
	if(isMultiplayer)
	{
		setStoredValue('multiplayerNames', inputPlayerName.value);
	}
	else
	{
		setStoredValue('lastPlayer', inputPlayerName.value);
	}
}

function generate()
{
	// Remove old gameboard.
	while(wrapper.firstChild){wrapper.removeChild(wrapper.firstChild);}
	minefield = false;

	// Save parameters
	setStoredValue('width', inputWidth.valueAsNumber);
	setStoredValue('height', inputHeight.valueAsNumber);
	setStoredValue('population', inputPopulation.valueAsNumber);

	// Get parameters
	width = inputWidth.valueAsNumber;
	height = inputHeight.valueAsNumber;
	population = Math.min(1, inputPopulation.valueAsNumber/100);

	// Print number of mines
	totalNumberOfMines = Math.floor(Math.min(width*height - 1, width*height*population));
	totalNumberOfMines = Math.max(1, totalNumberOfMines);
	document.getElementById('mineCounter').innerText = totalNumberOfMines;

	// Generate new
	listOfCells = Array();
	gameboard = document.createElement('div');
	gameboard.classList.add('board');
	gameboard.oncontextmenu = function(){return false;};
	for(var rowIndex = 0; rowIndex < height; rowIndex++)
	{
		var row = document.createElement('div');
		row.classList.add('row');
		for(var columnIndex = 0; columnIndex < width; columnIndex++)
		{
			var cellCoordinate = columnIndex + '_' + rowIndex;
			var cell = document.createElement('div');
			listOfCells.push(cell);
			cell.classList.add('cell');
			var blocker = document.createElement('div');
			blocker.id = cellCoordinate;
			blocker.classList.add('blocker');
			cell.onclick = function(){click(this, true);};
			cell.oncontextmenu = function(){click(this, false); return false;};
			cell.appendChild(blocker);
			row.appendChild(cell);
		}
		gameboard.appendChild(row);
	}
	wrapper.appendChild(gameboard);

	if(!isMultiplayer)
	{
		getStoredTables();
		updateTable();
	}
	else
	{
		multiplayerPlayTime = inputTimePerPlayer.valueAsNumber * 1000;

		// Remove old player list.
		while(playerRowList.firstChild){playerRowList.removeChild(playerRowList.firstChild);}

		// Generate scorce table
		var playerNames = inputPlayerName.value;
		var playerNamesArray = playerNames.split('\n');
		playerNamesArray.sort();

		if(playerNamesHistory !== playerNames)
		{
			playerNamesHistory = playerNames;

			// Remove old table
			var dataRows = document.getElementsByClassName('data-row');
			while(0 < dataRows.length)
			{
				var element = dataRows[0];
				element.parentNode.removeChild(element);
			}

			// Generate new
			playerNamesArray.forEach(function(playerName)
			{
				var tableRow = document.createElement('tr');
				tableRow.classList.add('data-row');

				// Name
				var tableCell = document.createElement('td');
				tableCell.classList.add('data-row');
				tableCell.innerHTML = playerName;
				tableRow.appendChild(tableCell);

				// Losses
				var tableCell = document.createElement('td');
				tableCell.id = 'row_' + playerName;
				tableCell.classList.add('data-row');
				tableCell.innerHTML = 0;
				tableCell.dataset.losses = 0;
				tableRow.appendChild(tableCell);

				tableLosses.appendChild(tableRow);
			}, this);
		}

		// Create players
		players = Array();
		var time;	// Get last time in loop.
		while(0 < playerNamesArray.length)
		{
			var randomIndex = Math.floor(Math.random() * playerNamesArray.length);
			var nameString = playerNamesArray.splice(randomIndex, 1)[0];
			var player = {'name': nameString, 'timeleft': multiplayerPlayTime};
			players.push(player);

			// Create new player list.
			var playerRow = document.createElement('div');
			playerRow.classList.add('player-row');

			time = document.createElement('div');
			time.innerHTML = convertToSeconds(multiplayerPlayTime);
			time.classList.add('time');
			playerRow.appendChild(time);

			var name = document.createElement('div');
			name.innerHTML = nameString;
			name.classList.add('name');
			playerRow.appendChild(name);

			playerRowList.appendChild(playerRow);
		}
		time.id = 'time';
		switchPlayer();	// TODO: Add comment to why this is called. To initiate playertime-handeler?
	}
	restart();
	updateGlobalTable();
	resizeScreen();
}

function resizeScreen()
{
	document.body.style.zoom = 1;
	let zoomWidth = document.body.parentElement.clientWidth / (document.body.clientWidth + 16);
	let zoomHeight = document.body.parentElement.clientHeight / (document.body.clientHeight + 16);
	document.body.style.zoom = Math.min(zoomWidth, zoomHeight);
}

function restart()
{
	var wasFinnished = isFinnished;
	timeStarted = undefined;
	isFinnished = false;

	if(wasFinnished)
	{
		animateScreen();
	}

	for(var rowIndex = 0; rowIndex < height; rowIndex++)
	{
		for(var columnIndex = 0; columnIndex < width; columnIndex++)
		{
			var blocker = document.getElementById(columnIndex + '_' + rowIndex);
			blocker.classList.remove('revealed');
			blocker.classList.remove('marked');
			blocker.classList.remove('marked-mine');
		}
	}

	updateMarkCounter();
}

function convertToSeconds(timestamp)
{
	var minutes = '';
	var preSeconds = '';
	var postSeconds = '';
	if(0 < parseFloat(timestamp))
	{
		var timePlayed = timestamp/1000;
		var seconds = timePlayed%60;

		if(60 <= timePlayed)
		{
			minutes = Math.floor(timePlayed/60) + ':';

			if(seconds < 10 && 10 < timePlayed)
			{
				preSeconds = '0';
			}
		}

		seconds = Math.round(seconds*100)/100;
		if(seconds%1 == 0)
		{
			postSeconds = '.00';
		}
		else if(seconds*10%1 == 0)
		{
			postSeconds = '0';
		}
	}
	else
	{
		seconds = '0.00';
	}

	var returnString = minutes + preSeconds + seconds + postSeconds;

	return returnString;
}

function animateScreen(timestamp)
{
	if(isFinnished)
	{
		return;	// Disable
	}

	if(isMultiplayer)
	{
		var timeleft;
		var player = players[0];

		if(timeStarted === undefined)
		{
			timeleft = multiplayerPlayTime;
		}
		else
		{
			timeleft = timeStarted + player.timeleft - Date.now();
		}

		if(timeleft < 0)
		{
			timeleft = 0;
			gameOver();
		}

		document.getElementById('time').innerHTML = convertToSeconds(timeleft);
	}
	else
	{
		document.getElementById('time').innerHTML = convertToSeconds(Date.now() - timeStarted);
	}
	window.requestAnimationFrame(animateScreen);
}

function updateMarkCounter()
{
	if(!isMultiplayer)
	{
		document.getElementById('markCounter').innerText = document.getElementsByClassName('marked-mine').length;
	}
}

var clickEventActive = false;
function click(cell, reveal)
{
	var blocker = cell.getElementsByClassName('blocker')[0];

	if(clickEventActive || isFinnished || blocker.classList.contains('revealed'))
	{
		return;	// Disable
	}
	else
	{
		clickEventActive = true;
	}

	var blockerID = blocker.id;

	if(reveal && minefield === false)
	{
		populateMines(blockerID);
		timeStarted = Date.now();
	}

	if(reveal)
	{
		if(!blocker.classList.contains('marked-mine'))
		{
			if(blocker.parentElement.classList.contains('mine'))
			{
				blocker.parentElement.classList.add('mine-clickend');
				gameOver();
			}
			else
			{
				revealThisAndNearby(blockerID, !checkboxQuickGame.checked);
				if(isMultiplayer)
				{
					switchPlayer();
					var noMoreCellsLeft = true;
					for(var index = 0; index < listOfCells.length; index++)
					{
						var cell = listOfCells[index];

						if(!cell.classList.contains('mine'))
						{
							if(!cell.getElementsByClassName('blocker')[0].classList.contains('revealed'))
							{
								noMoreCellsLeft = false;
							}
						}
					}
					if(noMoreCellsLeft)
					{
						var mines = document.getElementsByClassName('mine');
						[].slice.call(mines).forEach(function(mine)
						{
							mine.getElementsByClassName('blocker')[0].classList.add('marked-mine');
						}, this);
						gameOver(false);
					}
				}
			}
		}
	}
	else if(!blocker.classList.contains('revealed') && !isMultiplayer)
	{
		if(!blocker.classList.contains('marked-mine'))
		{
			blocker.classList.add('marked-mine');
		}
		else if(!blocker.classList.contains('marked'))
		{
			blocker.classList.add('marked')
		}
		else
		{
			blocker.classList.remove('marked-mine');
			blocker.classList.remove('marked');
		}

		updateMarkCounter();
	}

	clickEventActive = false;
}

function switchPlayer()
{
	var currentPlayer = players.shift();
	if(timeStarted !== undefined)
	{
		var timePassed = (Date.now() - timeStarted);
		currentPlayer.timeleft = currentPlayer.timeleft - timePassed;
	}
	players.push(currentPlayer);
	timeStarted = Date.now();

	// Switch time counter.
	var array = playerRowList.childNodes;
	var current = array[array.length - 1];
	current.getElementsByClassName('time')[0].id = '';
	var next = array[array.length - 2];
	next.getElementsByClassName('time')[0].id = 'time';
	array[0].insertAdjacentElement('beforebegin', current);
}

function getNearby(blockerID)
{
	var coordinateArray = blockerID.split('_');
	var columnIndex = Math.floor(coordinateArray[0]);
	var rowIndex = Math.floor(coordinateArray[1]);

	var columnIndex_W = columnIndex + 1;
	var columnIndex_E = columnIndex - 1;
	var rowIndex_N = rowIndex + 1;
	var rowIndex_S = rowIndex - 1;

	var nearbyBlockers = Array();
	nearbyBlockers.push(document.getElementById(columnIndex + '_' + rowIndex_N));
	nearbyBlockers.push(document.getElementById(columnIndex_E + '_' + rowIndex_N));
	nearbyBlockers.push(document.getElementById(columnIndex_E + '_' + rowIndex));
	nearbyBlockers.push(document.getElementById(columnIndex_E + '_' + rowIndex_S));
	nearbyBlockers.push(document.getElementById(columnIndex + '_' + rowIndex_S));
	nearbyBlockers.push(document.getElementById(columnIndex_W + '_' + rowIndex_S));
	nearbyBlockers.push(document.getElementById(columnIndex_W + '_' + rowIndex));
	nearbyBlockers.push(document.getElementById(columnIndex_W + '_' + rowIndex_N));

	return nearbyBlockers;
}

function revealThisAndNearby(blockerID, slowReveal, allreadyRevealed)
{
	if(allreadyRevealed === undefined)
	{
		allreadyRevealed = Array();
	}

	var rootBlocker = document.getElementById(blockerID);
	var rootCell = rootBlocker.parentElement;
	if((rootCell.classList.length == 1) && allreadyRevealed.indexOf(blockerID) < 0)	// If empty cell and not allready checked.
	{
		var nearbyBlockers = getNearby(blockerID);
		nearbyBlockers.forEach(function(blocker)
		{
			if(blocker !== null)
			{
				if(!blocker.classList.contains('revealed'))
				{
					allreadyRevealed.push(blockerID);
					if(slowReveal)
					{
						setTimeout(function()
						{
							revealThisAndNearby(blocker.id, slowReveal, allreadyRevealed);
						}, 150);
					}
					else
					{
						revealThisAndNearby(blocker.id, slowReveal, allreadyRevealed);
					}
				}
			}
		}, this);
	}

	if(slowReveal)
	{
		rootBlocker.classList.add('revealed-animate');
	}
	rootBlocker.classList.add('revealed');
	rootBlocker.classList.remove('marked-mine');
	rootBlocker.classList.remove('marked');
	updateMarkCounter();
	checkIfFinished();
}

function populateMines(exceptCellID)
{
	// Place mines
	var minesLeft = totalNumberOfMines;
	do
	{
		var columnIndex = Math.floor(Math.random()*width);
		var rowIndex = Math.floor(Math.random()*height);
		var cellID = columnIndex + '_' + rowIndex;
		var cell = document.getElementById(cellID).parentElement;
		if(cellID !== exceptCellID && !cell.classList.contains('mine'))
		{
			minefield = true;
			cell.classList.add('mine');
			minesLeft--;
		}
	}while(0 < minesLeft);

	// Add numbers
	for(var rowIndex = 0; rowIndex < height; rowIndex++)
	{
		for(var columnIndex = 0; columnIndex < width; columnIndex++)
		{
			var currentCell_id = columnIndex + '_' + rowIndex;
			var currentCell = document.getElementById(currentCell_id).parentElement;
			if(!currentCell.classList.contains('mine'))
			{
				var nearbyCells = getNearby(currentCell_id);

				var minesNearby = 0;
				nearbyCells.forEach(function(blocker)
				{
					if(blocker !== null)
					{
						if(blocker.parentElement.classList.contains('mine'))
						{
							minesNearby++;
						}
					}
				}, this);

				// Place number
				if(0 < minesNearby)
				{
					var number = document.createElement('div');
					number.classList.add('number');
					number.innerHTML = minesNearby;
					var blocker = currentCell.childNodes[0];
					currentCell.removeChild(blocker);
					currentCell.appendChild(number);
					currentCell.appendChild(blocker);
					currentCell.classList.add('cell-number');
				}
			}
		}
	}
}

var checkingIfFinnished = false;
function checkIfFinished()
{
	while(checkingIfFinnished);
	checkingIfFinnished = true;

	if(!isFinnished)
	{
		var timeNow = Date.now();
		var blockers = document.getElementsByClassName('blocker');
		var blockersArray = [].slice.call(blockers);

		isFinnished = true;
		for(var index = 0; index < blockersArray.length; index++)
		{
			var blocker = blockersArray[index];
			if(!blocker.classList.contains('revealed') && !blocker.parentElement.classList.contains('mine'))
			{
				isFinnished = false;
				break;
			}
		}

		if(isFinnished)
		{
			if(!isMultiplayer)	// TODO: Quick fix. Move to higer scope when finished.
			{
				var finalTime = timeNow - timeStarted;
				document.getElementById('time').innerHTML = convertToSeconds(finalTime);
				addPlayToTable(finalTime);
			}
			revealAll();
		}
	}

	checkingIfFinnished = false;
}

function gameOver(multiplayerLose)
{
	isFinnished = true;

	var blockers = document.getElementsByClassName('blocker');
	[].slice.call(blockers).forEach(function(blocker)
	{
		var found = blocker.classList.contains('revealed');
		found |= blocker.classList.contains('marked-mine');
		found |= blocker.parentElement.classList.contains('mine-clickend');

		if(!found)
		{
			blocker.classList.add('not-found');
		}
	}, this);

	if(isMultiplayer && multiplayerLose !== false)
	{
		timeStarted = undefined;
		let array = playerRowList.childNodes;
		let playerName = array[array.length-1].getElementsByClassName('name')[0].innerHTML;
		var loseCounter = document.getElementById('row_' + playerName);
		loseCounter.dataset.losses++;
		loseCounter.innerHTML = loseCounter.dataset.losses;
	}

	revealAll();
}

function revealAll()
{
	var blockers = document.getElementsByClassName('blocker');
	[].slice.call(blockers).forEach(function(blocker)
	{
		blocker.classList.add('revealed');
		if(blocker.parentElement.classList.contains('mine'))
		{
			if(blocker.classList.contains('marked'))
			{
				blocker.parentElement.classList.add('mine-expected');
			}
			else if(blocker.classList.contains('marked-mine'))
			{
				blocker.parentElement.classList.add('mine-found');
			}
		}
		else
		{
			if(blocker.classList.contains('marked-mine'))
			{
				blocker.parentElement.classList.add('marked-cell-without-mine');
			}
		}
	}, this);
}

function saveCookie_quickGame()
{
	setStoredValue('quickGame', checkboxQuickGame.checked);
}

function getStoredTables()
{
	topPlaysArray = Array();

	var storedTable = getStoredValue('storedTable');
	if(storedTable !== '')
	{
		var tableRows = storedTable.split(SEPERATOR + SEPERATOR);
		tableRows.forEach(function(row)
		{
			var tableRow = Array();
			var columns = row.split(SEPERATOR);
			columns.forEach(function(column)
			{
				var slicedColumn = column.split('=');
				var key = slicedColumn[0];
				var value = decodeURIComponent(slicedColumn[1]);
				if(key != 'name')
				{
					value = parseInt(value);
				}
				tableRow[key] = value;
			}, this);

			topPlaysArray.push(tableRow);
		}, this);
	}
}

function fetchTablesFromDatabase()
{
	postManager.send('/api/', {module: 'Minesweeper.GetGlobalHigescores'}, returnData => {
		if(returnData !== '')
		{
			topPlaysArray = returnData;
			createTables();
		}
		else
		{
			wrapper.innerHTML = 'Error.';
		}
	},
	error => wrapper.innerHTML = 'Error.');
}

function addPlayToTable(playedMilliseconds)
{
	var tableRow =
	{
		'time': playedMilliseconds,
		'width': width,
		'height': height,
		'mines': totalNumberOfMines,
		'name': strip(inputPlayerName.value),
		'timestamp': Date.now(),
		'uploaded': 0	// Boolean: false
	};

	topPlaysArray.push(tableRow);
	saveTable();
	updateTable();
	updateGlobalTable();
}

function updateGlobalTable()
{
	topPlaysArray.forEach(function(tableRow_data)
	{
		if(tableRow_data.uploaded !== 1)
		{
			params = {
				module: 'Minesweeper.AddScore',
				time: tableRow_data.time,
				width: tableRow_data.width,
				height: tableRow_data.height,
				mines: tableRow_data.mines,
				name: tableRow_data.name,
				timestamp: Math.floor(tableRow_data.timestamp/1000)	// milliseconds -> seconds
			};

			postManager.send('/api/', params, responseText => {
				if(responseText === '1')
				{
					tableRow_data.uploaded = 1;	// Boolean: true
					saveTable();
				}
			},
			undefined, 'text');
		}
	});
}

function toggleTable(headerRow)
{
	var tableRows = [].slice.call(headerRow.parentElement.children);
	tableRows.forEach(function(localHeaderRow)
	{
		if(headerRow !== localHeaderRow)
		{
			localHeaderRow.classList.toggle('hide');
		}
	});
}

function updateTable()
{
	// Remove old table
	var dataRows = document.getElementsByClassName('data-row');
	while(0 < dataRows.length)
	{
		var element = dataRows[0];
		element.parentNode.removeChild(element);
	}

	// Filter top plays
	var localTopPlays = topPlaysArray.filter(function(tableRow)
	{
		return tableRow.width === width && tableRow.height === height && tableRow.mines === totalNumberOfMines;
	});

	// Sort top plays
	localTopPlays = localTopPlays.sort(function(tableRow_A, tableRow_B)
	{
		return tableRow_A.time - tableRow_B.time;
	});

	// Trim top plays
	localTopPlays = localTopPlays.slice(0, topPlays);

	// Print to table
	document.getElementById('gameSize').innerHTML = width + 'x' + height + 'x' + totalNumberOfMines;
	var index = 1;
	localTopPlays.forEach(function(tableRow_data)
	{
		var tableRow = document.createElement('tr');
		tableRow.classList.add('data-row');

		// Place
		var tableCell = document.createElement('td');
		tableCell.innerHTML = index++;
		tableCell.classList.add('place');
		tableRow.appendChild(tableCell);

		// Name
		var tableCell = document.createElement('td');
		tableCell.innerHTML = tableRow_data.name;
		tableRow.appendChild(tableCell);

		// Time
		var tableCell = document.createElement('td');
		tableCell.innerHTML = convertToSeconds(tableRow_data.time);
		tableCell.classList.add('duration');
		tableRow.appendChild(tableCell);

		// Date
		var tableCell = document.createElement('td');
		var date = new Date(tableRow_data.timestamp);
		tableCell.innerHTML = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
		tableCell.classList.add('date');
		tableRow.appendChild(tableCell);

		tableTopPlays.appendChild(tableRow);
	}, this);

	// Add empty rows.
	for(var rowsLeft = topPlays - index; 0 <= rowsLeft; rowsLeft--)
	{
		var tableRow = document.createElement('tr');
		tableRow.classList.add('data-row');
		tableRow.classList.add('empty-row');

		var tableCell = document.createElement('td');
		tableCell.innerHTML = index++;
		tableCell.classList.add('place');
		tableRow.appendChild(tableCell);

		var numberOfColumns = 4;
		for(var indexCell = 1; indexCell < numberOfColumns; indexCell++)
		{
			var tableCell = document.createElement('td');
			tableRow.appendChild(tableCell);
		}
		tableTopPlays.appendChild(tableRow);
	}
}

function createTables()
{
	// Variables
	var arrayWidth = Array();
	var arrayHeights = Array();
	var arrayPopulation = Array();

	// Find uniqes.
	topPlaysArray.forEach(function(tableRow_data)
	{
		if(0 < tableRow_data.width && arrayWidth.indexOf(tableRow_data.width) < 0)
		{
			arrayWidth.push(tableRow_data.width);
		}
		
		if(0 < tableRow_data.height && arrayHeights.indexOf(tableRow_data.height) < 0)
		{
			arrayHeights.push(tableRow_data.height);
		}
		
		if(0 < tableRow_data.mines && arrayPopulation.indexOf(tableRow_data.mines) < 0)
		{
			arrayPopulation.push(tableRow_data.mines);
		}
	});

	// Repeat for each combination
	arrayWidth.forEach(function(uniqeWidth)
	{
		arrayHeights.forEach(function(uniqeHeight)
		{
			arrayPopulation.forEach(function(uniqePopulation)
			{
				// Create table and header rows.
				var table = document.createElement('table');
				// Major header
				var mainHeaderRow = document.createElement('tr');
				mainHeaderRow.classList.add('header-row');
				mainHeaderRow.onclick = function(){toggleTable(mainHeaderRow)};
				var headerCell = document.createElement('th');
				headerCell.colSpan = 4;
				headerCell.innerHTML = 'Higescore (' + uniqeWidth + 'x' + uniqeHeight + 'x' + uniqePopulation + ')';
				mainHeaderRow.appendChild(headerCell);
				table.appendChild(mainHeaderRow);
				// Sub header
				var headerRow = document.createElement('tr');
				headerRow.classList.add('header-row');
				headerCell = document.createElement('th');
				headerCell.innerHTML = 'Place';
				headerRow.appendChild(headerCell);
				headerCell = document.createElement('th');
				headerCell.innerHTML = 'Name';
				headerRow.appendChild(headerCell);
				headerCell = document.createElement('th');
				headerCell.innerHTML = 'Time';
				headerRow.appendChild(headerCell);
				headerCell = document.createElement('th');
				headerCell.innerHTML = 'Date';
				headerRow.appendChild(headerCell);
				table.appendChild(headerRow);

				// Filter localTopPlays
				var localTopPlays = topPlaysArray.filter(function(tableRow)
				{
					return tableRow.width === uniqeWidth && tableRow.height === uniqeHeight && tableRow.mines === uniqePopulation;
				});

				// Sort top plays
				localTopPlays = localTopPlays.sort(function(tableRow_A, tableRow_B)
				{
					return tableRow_A.time - tableRow_B.time;
				});

				if(0 < localTopPlays.length)
				{
					// Print to table
					var index = 1;
					localTopPlays.forEach(function(tableRow_data)
					{
						var tableRow = document.createElement('tr');
						tableRow.classList.add('data-row');

						// Place
						var tableCell = document.createElement('td');
						tableCell.innerHTML = index++;
						tableCell.classList.add('place');
						tableRow.appendChild(tableCell);

						// Name
						var tableCell = document.createElement('td');
						tableCell.innerHTML = tableRow_data.name;
						tableRow.appendChild(tableCell);

						// Time
						var tableCell = document.createElement('td');
						tableCell.innerHTML = convertToSeconds(tableRow_data.time);
						tableCell.classList.add('duration');
						tableRow.appendChild(tableCell);

						// Date
						var tableCell = document.createElement('td');
						var date = new Date(tableRow_data.timestamp);
						tableCell.innerHTML = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
						tableCell.classList.add('date');
						tableRow.appendChild(tableCell);

						table.appendChild(tableRow);
					}, this);

					wrapper.appendChild(table);
					toggleTable(mainHeaderRow);
				}
			});
		});
	});
}

function saveTable()
{
	var tableString = '';

	topPlaysArray.forEach(function(row)
	{
		if(tableString !== '')
		{
			tableString += SEPERATOR + SEPERATOR;
		}

		var columnString = '';
		for(var column in row)
		{
			if(row.hasOwnProperty(column))
			{
				var value = encodeURIComponent(row[column]);

				if(columnString !== '')
				{
					columnString += SEPERATOR;
				}
				columnString += column + '=' + value;
			}
		}
		tableString += columnString;
	}, this);

	setStoredValue('storedTable', tableString);
}

function setStoredValue(name, value)
{
	value = strip(value);
	encodeURIComponent(value);
	localStorage.setItem('minesweeper.' + name, value);
}

function getStoredValue(name)
{
	var value = localStorage.getItem('minesweeper.' + name);
	value = decodeURIComponent(value);
	value = strip(value);
	return value === 'null' ? '' : value;
}

function strip(html)
{
	var output = '';

	do
	{
		var tempString = output;

		var element = document.createElement('div');
		element.innerHTML = html;
		output = element.textContent || element.innerText || '';
	}
	while(tempString !== output && output !== '');

	return output;
}