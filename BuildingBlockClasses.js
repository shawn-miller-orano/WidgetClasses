class LiveCell {
    constructor(tableKeyCode, columnKeyCode, secondaryColumnKeyCode) {
        this.tableKeyCode = tableKeyCode;
        this.columnKeyCode = columnKeyCode;
        this.pullFromJSON = this.pullFromJSON.bind(this);
        this.setParentRecordID = this.setParentRecordID.bind(this);
        this.getValue = this.getValue.bind(this);
        this.setValue = this.setValue.bind(this);
        this.updateValue = this.updateValue.bind(this);
        this.emit = this.emit.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.unsubscribe = this.unsubscribe.bind(this);
        this.secondaryColumnKeyCode = secondaryColumnKeyCode;
        this.subscribers = [];
    }

    pullFromJSON(json) {
        if (this.secondaryColumnKeyCode == null) {
            this.setValue(json[this.columnKeyCode]);
        }
        else {
            this.setValue(json[this.columnKeyCode][this.secondaryColumnKeyCode]);
        }
    }

    updateFromJSON(json) {

        if (this.secondaryColumnKeyCode == null) {
            let newValue = json[this.columnKeyCode];
            if (newValue != this.value) {
                if (newValue != null) {
                    this.updateValue(newValue);
                }
            }
        }
        else {
            let newValue = json[this.columnKeyCode][this.secondaryColumnKeyCode];
            if (newValue != this.value) {
                if (newValue != null) {
                    this.updateValue(newValue);
                }
            }
        }
    }


    setParentRecordID(parentRecordID) { this.recordID = parentRecordID; }

    getValue() { return this.value; }

    setValue(newValue) {
        if (this.value != null) {
            if (newValue != this.value) {
                this.value = newValue;
                this.emit();
            }
        }
        else {
            this.value = newValue;
            this.emit();
        }

    }

    updateValue(updatedValue) {


        this.value = updatedValue;

        this.emit();


        if (
            this.columnKeyCode != null ||
            this.recordID != null ||
            this.tableKeyCode != null
        ) {
            let requestBody = {};
            requestBody[this.columnKeyCode] = updatedValue;

            let requestString = "https://orano.tulip.co/api/v3/tables/";
            requestString += this.tableKeyCode;
            requestString += "/records/";
            requestString += this.recordID;

            let tableRequest = new XMLHttpRequest();
            tableRequest.open("PUT", requestString);
            tableRequest.setRequestHeader(
                "Authorization",
                authKey
            );

            tableRequest.responseType = "json";
            tableRequest.send(JSON.stringify(requestBody));




        }
    }

    emit() { this.subscribers.forEach((subscriber) => subscriber(this.value)); }
    subscribe(callback) { this.subscribers.push(callback); }
    unsubscribe(callback) { this.subscribers.pop(callback); }
}

class LiveValue {
    constructor(value) {
        this.value = value;
        this.subscribers = [];
    }
    getValue() {
        return this.value;
    }

    setValue(newValue) {
        this.value = newValue;
        //this.emit();
    }

    emit() {
        this.subscribers.forEach((subscriber) => subscriber(this.value));
    }

    subscribe(callback) {
        this.subscribers.push(callback);
    }

    unsubscribe(callback) {
        this.subscribers.pop(callback);
    }
}

class LiveRecord {
    constructor() {
        //this.setParentLiveTable = this.setParentLiveTable.bind(this);
        this.emitDeleted = this.emitDeleted.bind(this);
        this.emitChanged = this.emitChanged.bind(this);
        this.subscribeToDelete = this.subscribeToDelete.bind(this);
        this.deleteRecord = this.deleteRecord.bind(this);
        this.subscribeToChanges = this.subscribeToChanges.bind(this);

        this.deleteSubscribers = [];
        this.changeSuscribers = [];
        this.columns = [];
    }

    //setParentLiveTable(parentLiveTable) {
    //    this.parentLiveTable = parentLiveTable;
    //}




    generateEditForm() {
        let erf = new EditRecordForm(this);
        erf.setRecordType(this.constructor.name);

        erf.buildForm();

        erf.open();

        return erf;

    }

    emitDeleted() {
        this.deleteSubscribers.forEach((subscriber) => subscriber(this, "Deleted"));
        //this.deletedSubscribers = null;
    }

    emitChanged() {
        this.changeSuscribers.forEach((subscriber) => subscriber(this, "Changed"));
        //this.deletedSubscribers = null;
    }

    subscribeToDelete(callback) {
        this.deleteSubscribers.push(callback);
    }

    subscribeToChanges(callback) {
        this.changeSuscribers.push(callback);
    }

    deleteRecord() {
        if (this.tableKeyCode != null) {
            //let requestBody = record;

            let requestString = "https://orano.tulip.co/api/v3/tables/";
            requestString += this.tableKeyCode;
            requestString += "/records/";
            requestString += this.id.value;
            let tableRequest = new XMLHttpRequest();
            tableRequest.open("DELETE", requestString);
            tableRequest.setRequestHeader(
                "Authorization",
                authKey
            );
            //this.tableRequest.responseType = "json";
            tableRequest.send();
            //this.forceRebuild(updatedValue);
            this.emitDeleted();
        }
    }


    addVars(json) {
        let recordID = json["id"];
        for (let i = 0; i < this.columns.length; i++) {
            this.columns[i].pullFromJSON(json);
            this.columns[i].setParentRecordID(recordID);
        }
    }

    updateVars(json) {
        for (let i = 0; i < this.columns.length; i++) {
            this.columns[i].updateFromJSON(json);
        }
        this.emitChanged();
    }
}

class LiveUserTable {
    constructor() {
        this.activeRows = [];
        this.setReturnType = this.setReturnType.bind(this);
        this.addRecord = this.addRecord.bind(this);
        this.generateRequestObject = this.generateRequestObject.bind(this);
        this.deleteRecord = this.deleteRecord.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.emit = this.emit.bind(this);
        this.checkForExistingAgg = this.checkForExistingAgg.bind(this);
        this.returnUniqueValuesForColumn =
            this.returnUniqueValuesForColumn.bind(this);

        this.subscribers = [];
        this.aggregations = [];

        this.returnRowType = "User";
    }

    checkForExistingAgg(columnName, aggType) {
        for (let i = 0; i < this.aggregations.length; i++) {
            if (this.aggregations[i].constructor.name == aggType) {
                if (this.aggregations[i].columnName == columnName) {
                    return this.aggregations[i];
                }
            }
        }

        return null;
    }

    addRecord(record) {
        if (this.tableKeyCode != null) {
            let requestBody = record;

            let requestString = "https://orano.tulip.co/api/v3/tables/";
            requestString += this.tableKeyCode;
            requestString += "/records";

            let tableRequest = new XMLHttpRequest();
            tableRequest.open("POST", requestString);
            tableRequest.setRequestHeader(
                "Authorization",
                authKey
            );

            //this.tableRequest.responseType = "json";
            tableRequest.send(JSON.stringify(requestBody));

            this.emit();
            //this.forceRebuild(updatedValue);
        }
    }

    setReturnType(returnType) {
        this.returnType = returnType;
    }

    generateRequestObject() {
        this.httpRequest = new MultipleUserReturnRequest(
            "User",
            this.activeRows,
            null,
            [],
            [],
            [],
            this
        );
    }

    deleteRecord(record) {
        if (this.tableKeyCode != null) {
            //let requestBody = record;

            let requestString = "https://orano.tulip.co/api/v3/tables/";
            requestString += this.tableKeyCode;
            requestString += "/records/";
            requestString += record.id.value;

            let tableRequest = new XMLHttpRequest();
            tableRequest.open("DELETE", requestString);
            tableRequest.setRequestHeader(
                "Authorization",
                authKey
            );

            tableRequest.send();

            //this.forceRebuild(updatedValue);
            this.emit();
        }
    }

    emit() {
        if (this.activeRows.length != 0) {
            this.subscribers.forEach((subscriber) => subscriber(this.activeRows));
        }
    }

    subscribe(callback) {
        if (this.subscribers.includes(callback)) {
        } else {
            this.subscribers.push(callback);
            callback(this.activeRows)
        }
    }

    returnUniqueValuesForColumn(columnAttributeName) {
        let uniqueValues = [];
        for (let i = 0; i < this.activeRows.length; i++) {
            if (
                uniqueValues.includes(this.activeRows[i][columnAttributeName].value)
            ) {
            } else {
                uniqueValues.push(this.activeRows[i][columnAttributeName].value);
            }
        }
        return uniqueValues;
    }
}

class LiveTable {
    constructor(tableKeyCode, returnRowType,authKey) {
        this.activeRows = [];
        this.authKey = authKey;
        this.setReturnType = this.setReturnType.bind(this);
        this.addRecord = this.addRecord.bind(this);
        this.generateRequestObject = this.generateRequestObject.bind(this);
        this.deleteRecord = this.deleteRecord.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.emit = this.emit.bind(this);
        this.checkForExistingAgg = this.checkForExistingAgg.bind(this);
        this.recordChanged = this.recordChanged.bind(this);
        this.addPrefilter = this.addPrefilter.bind(this);

        

        this.subscribers = [];

        this.aggregations = [];

        this.prefilterColumns = [];
        this.prefilterValues = [];
        this.prefilterFunctions = [];

        this.tableKeyCode = tableKeyCode;
        this.returnRowType = returnRowType;

        this.testerObject = eval(`new ${this.returnRowType}();`);
    }

    simpleFunction() {
        console.log("testThing");
        this.testString = "testThingTwo";
    }

    checkForExistingAgg(columnName, aggType) {
        for (let i = 0; i < this.aggregations.length; i++) {
            if (this.aggregations[i].constructor.name == aggType) {
                if (this.aggregations[i].columnName == columnName) {
                    return this.aggregations[i];
                }
            }
        }

        return null;
    }
    
    
    addPrefilter(prefilterObject) {
        console.log(this.testerObject[prefilterObject.columnName]);
        this.prefilterColumns.push(this.testerObject[prefilterObject.columnName].columnKeyCode);
        this.prefilterValues.push(prefilterObject.columnValue);
        this.prefilterFunctions.push(prefilterObject.functionType);
    }

    addRecord(recordJSON, rowObject) {
        if (this.tableKeyCode != null) {


            rowObject.subscribeToDelete((record, changeCode) =>
                this.triageRecordSignal(record, changeCode)
            );
            rowObject.subscribeToChanges((record, changeCode) =>
                this.triageRecordSignal(record, changeCode)
            );

            this.activeRows.push(rowObject);


            this.emit();

            let requestBody = recordJSON;

            let requestString = "https://orano.tulip.co/api/v3/tables/";
            requestString += this.tableKeyCode;
            requestString += "/records";

            let tableRequest = new XMLHttpRequest();
            tableRequest.open("POST", requestString);
            tableRequest.setRequestHeader(
                "Authorization",
                this.authKey
            );

            //this.tableRequest.responseType = "json";
            tableRequest.send(JSON.stringify(requestBody));

            //this.forceRebuild(updatedValue);
        }
    }

    setReturnType(returnType) {
        this.returnType = returnType;
    }

    generateRequestObject() {
        this.httpRequest = new MultipleReturnRequestLive(
            this.authKey,
            this.returnRowType,
            this.activeRows,
            this.tableKeyCode,
            this.prefilterColumns,
            this.prefilterValues,
            this.prefilterFunctions,
            this
        );
    }

    triageRecordSignal(record, changeCode) {
        if (changeCode == "Changed") {
            this.recordChanged(record);
        } else if (changeCode == "Deleted") {
            this.deleteRecord(record);
        }
    }

    recordChanged(record) {
        this.emit();
    }

    deleteRecord(record) {
        if (this.tableKeyCode != null) {
            //let requestBody = record;

            let indexToRemove = this.activeRows.findIndex((obj) => obj === record);

            // Remove the object if it was found
            if (indexToRemove > -1) {
                this.activeRows.splice(indexToRemove, 1);
            }

            let requestString = "https://orano.tulip.co/api/v3/tables/";
            requestString += this.tableKeyCode;
            requestString += "/records/";
            requestString += record.id.value;

            let tableRequest = new XMLHttpRequest();
            tableRequest.open("DELETE", requestString);
            tableRequest.setRequestHeader(
                "Authorization",
                authKey
            );

            tableRequest.send();

            //let sdf = this.activeRows.pop(record);

            //this.forceRebuild(updatedValue);
            this.emit();
        }
    }

    emit() {
        this.subscribers.forEach((subscriber) => subscriber(this.activeRows));
    }

    subscribe(callback) {
        if (this.subscribers.includes(callback)) {
        } else {
            this.subscribers.push(callback);
            callback(this.activeRows);
        }
    }

    unsubscribe(callback) {
        /*
        let indexToRemove = this.subscribers.findIndex((obj) => obj === callback);

        // Remove the object if it was found
        if (indexToRemove > -1) {
            this.subscribers.splice(indexToRemove, 1);
        }

        */
        this.subscribers.pop(callback);
    }



    //findByID() {
    //
    //}

    returnUniqueValuesForColumn(columnAttributeName) {
        let uniqueValues = [];
        for (let i = 0; i < this.activeRows.length; i++) {
            if (
                uniqueValues.includes(this.activeRows[i][columnAttributeName].value)
            ) {
            } else {
                uniqueValues.push(this.activeRows[i][columnAttributeName].value);
            }
        }
        return uniqueValues;
    }
}

class RowsForTableColumnMatchRequest {
    constructor(authKey) {
        this.buildRequest = this.buildRequest.bind(this);
        this.sendRequest = this.sendRequest.bind(this);
        this.addVars = this.addVars.bind(this);
        this.authKey = authKey;
        this.matchingRows = [];

        this.requestFinishedFlag = false;

        //return matchingRows;
        //this.returnNumber = this.returnNumber.bind(this);
    }

    addVars(
        rowObjectType,
        rVar,
        rMultiple,
        tableCodeString,
        columnCodeStringArray,
        comparedValueStringArray,
        functionTypeStringArray
    ) {
        this.rVar = rVar;
        this.rowObjectType = rowObjectType;
        //this.rMultiple = rMultiple;

        this.tableCodeString = tableCodeString;
        this.columnCodeStringArray = columnCodeStringArray;
        this.comparedValueStringArray = comparedValueStringArray;
        this.functionTypeStringArray = functionTypeStringArray;
    }

    buildRequest() {
        this.preString = "https://orano.tulip.co/api/v3/tables/";
        this.aString = "/records?limit=100&filters=[";
        this.postString = "]";
        this.loopString = "";
        for (let k = 0; k < this.columnCodeStringArray.length; k++) {
            if (this.comparedValueStringArray[k].includes("[")) {
                var before = "%22, %22arg%22:";
                var after = "}, ";
            } else {
                var before = "%22, %22arg%22:  %22";
                var after = "%22}, ";
            }
            if (
                this.functionTypeStringArray[k] == "blank" ||
                this.functionTypeStringArray[k] == "notBlank"
            ) {
                let newString =
                    "{%22field%22:%22" +
                    this.columnCodeStringArray[k] +
                    "%22, %22functionType%22: %22" +
                    this.functionTypeStringArray[k] +
                    "%22}, ";
                this.loopString = this.loopString + newString;
            } else {
                let newString =
                    "{%22field%22:%22" +
                    this.columnCodeStringArray[k] +
                    "%22, %22functionType%22: %22" +
                    this.functionTypeStringArray[k] +
                    before +
                    this.comparedValueStringArray[k] +
                    after;
                this.loopString = this.loopString + newString;
            }
        }
        this.loopString = this.loopString.slice(0, -2);
        this.wholeString =
            this.preString +
            this.tableCodeString +
            this.aString +
            this.loopString +
            this.postString;
        this.tableRequest = new XMLHttpRequest();
        this.tableRequest.open("GET", this.wholeString);
        this.tableRequest.setRequestHeader(
            "Authorization",
            this.authKey
        );
        this.tableRequest.responseType = "json";
    }

    sendRequest() {
        this.tableRequest.send();

        this.tableRequest.onreadystatechange = (e) => {
            this.eventJSON = this.tableRequest.response;
            if (this.eventJSON != null) {
                for (let j = 0; j < this.eventJSON.length; j++) {
                    this.matchingRows.push(this.eventJSON[j]);
                }
                if (this.rowObjectType != null) {
                    this.pushUpdate();
                }
            }
        };
    }

    returnNumber() {
        return this.matchingRows.length;
    }
}

class UsersColumnMatchRequest {
    constructor() {
        this.buildRequest = this.buildRequest.bind(this);
        this.sendRequest = this.sendRequest.bind(this);
        this.addVars = this.addVars.bind(this);
        this.matchingRows = [];

        this.requestFinishedFlag = false;

        //return matchingRows;
        //this.returnNumber = this.returnNumber.bind(this);
    }

    addVars(
        rowObjectType,
        rVar,
        rMultiple,
        tableCodeString,
        columnCodeStringArray,
        comparedValueStringArray,
        functionTypeStringArray
    ) {
        this.rVar = rVar;
        this.rowObjectType = rowObjectType;
        //this.rMultiple = rMultiple;

        this.tableCodeString = tableCodeString;
        this.columnCodeStringArray = columnCodeStringArray;
        this.comparedValueStringArray = comparedValueStringArray;
        this.functionTypeStringArray = functionTypeStringArray;
    }

    buildRequest() {
        this.preString = "https://orano.tulip.co/api/users/v1/users";
        this.wholeString = this.preString;
        this.tableRequest = new XMLHttpRequest();
        this.tableRequest.open("GET", this.wholeString);
        this.tableRequest.setRequestHeader(
            "Authorization",
            authKey
        );
        this.tableRequest.responseType = "json";
    }

    sendRequest() {
        this.tableRequest.send();

        this.tableRequest.onreadystatechange = (e) => {
            this.eventJSON = this.tableRequest.response;
            if (this.eventJSON != null) {
                for (let j = 0; j < this.eventJSON["items"].length; j++) {
                    this.matchingRows.push(this.eventJSON["items"][j]);
                }
                if (this.rowObjectType != null) {
                    this.pushUpdate();
                }
            }
        };
    }

    returnNumber() {
        return this.matchingRows.length;
    }
}

class MultipleUserReturnRequest extends UsersColumnMatchRequest {
    constructor(
        rowObjectType,
        rVar,
        tableCodeString,
        columnCodeStringArray,
        comparedValueStringArray,
        functionTypeStringArray,
        parentLiveTable
    ) {
        super();
        this.addVars(
            rowObjectType,
            rVar,
            true,
            tableCodeString,
            columnCodeStringArray,
            comparedValueStringArray,
            functionTypeStringArray
        );
        this.pushUpdate = this.pushUpdate.bind(this);
        this.parentLiveTable = parentLiveTable;
        this.buildRequest();
        this.sendRequest();
    }

    pushUpdate() {
        for (let i = 0; i < this.rVar.length; i++) {
            this.rVar.pop();
        }
        for (let i = 0; i < this.matchingRows.length; i++) {
            let newObject = eval(`new ${this.rowObjectType}();`);
            newObject.addVars(this.matchingRows[i]);
            this.rVar.push(newObject);
        }
        this.requestFinishedFlag = true;
        this.parentLiveTable.emit();
    }
}

class SingleReturnRequest extends RowsForTableColumnMatchRequest {
    constructor(
        rowObjectType,
        rVar,
        tableCodeString,
        columnCodeStringArray,
        comparedValueStringArray,
        functionTypeStringArray
    ) {
        super();
        this.pushUpdate = this.pushUpdate.bind(this);
        this.addVars(
            rowObjectType,
            rVar,
            false,
            tableCodeString,
            columnCodeStringArray,
            comparedValueStringArray,
            functionTypeStringArray
        );
        this.buildRequest();
        this.sendRequest();
    }

    pushUpdate() {
        this.requestFinishedFlag = true;
        this.rVar.addVars(this.matchingRows[0]);
    }
}

class SingleReturnRequestWhereColumnFromCardDatapoint extends RowsForTableColumnMatchRequest {
    constructor(
        rowObjectType,
        rVar,
        tableCodeString,
        columnCodeStringArray,
        comparedCardDatapointArray,
        functionTypeStringArray
    ) {
        super();
        this.rowObjectType = rowObjectType;
        this.rVar = rVar;
        this.tableCodeString = tableCodeString;
        this.columnCodeStringArray = columnCodeStringArray;
        this.comparedCardDatapointArray = comparedCardDatapointArray;
        this.functionTypeStringArray = functionTypeStringArray;
        this.pushUpdate = this.pushUpdate.bind(this);
        this.runIt = this.runIt.bind(this);
        this.checkCards = this.checkCards.bind(this);
        this.checkCardsInterval = setInterval(this.checkCards, 200);
    }

    checkCards() {
        let allValid = true;
        for (let i = 0; i < this.comparedCardDatapointArray.length; i++) {
            if (this.comparedCardDatapointArray[i].value == null) {
                allValid = false;
            }
        }
        if (allValid == true) {
            this.comparedValueStringArray = [];
            for (let i = 0; i < this.comparedCardDatapointArray.length; i++) {
                this.comparedValueStringArray.push(
                    this.comparedCardDatapointArray[i].value
                );
            }
            this.runIt();
            clearInterval(this.checkCardsInterval);
        }
    }
    pushUpdate() {
        this.requestFinishedFlag = true;
        this.rVar.addVars(this.matchingRows[0]);
    }

    runIt() {
        this.addVars(
            this.rowObjectType,
            this.rVar,
            false,
            this.tableCodeString,
            this.columnCodeStringArray,
            this.comparedValueStringArray,
            this.functionTypeStringArray
        );
        this.buildRequest();
        this.sendRequest();
    }
}

class MultipleReturnRequest extends RowsForTableColumnMatchRequest {
    constructor(
        rowObjectType,
        rVar,
        tableCodeString,
        columnCodeStringArray,
        comparedValueStringArray,
        functionTypeStringArray
    ) {
        super();
        this.addVars(
            rowObjectType,
            rVar,
            true,
            tableCodeString,
            columnCodeStringArray,
            comparedValueStringArray,
            functionTypeStringArray
        );
        this.pushUpdate = this.pushUpdate.bind(this);
        this.buildRequest();
        this.sendRequest();
    }

    pushUpdate() {
        for (let i = 0; i < this.rVar.length; i++) {
            this.rVar.pop();
        }
        for (let i = 0; i < this.matchingRows.length; i++) {
            var newObject = eval(`new ${this.rowObjectType}();`);
            newObject.addVars(this.matchingRows[i]);
            this.rVar.push(newObject);
        }
        this.requestFinishedFlag = true;
    }
}
class MultipleReturnRequestLive extends RowsForTableColumnMatchRequest {
    constructor(
        authKey,
        rowObjectType,
        rVar,
        tableCodeString,
        columnCodeStringArray,
        comparedValueStringArray,
        functionTypeStringArray,
        parentLiveTable
    ) {
        super(authKey);
        this.addVars(
            rowObjectType,
            rVar,
            true,
            tableCodeString,
            columnCodeStringArray,
            comparedValueStringArray,
            functionTypeStringArray
        );
        this.parentLiveTable = parentLiveTable;
        this.authKey = authKey;
        this.pushUpdate = this.pushUpdate.bind(this);
        this.buildRequest();
        this.sendRequest();
    }

    pushUpdate() {
        for (let i = 0; i < this.rVar.length; i++) {
            this.rVar.pop();
        }
        for (let i = 0; i < this.matchingRows.length; i++) {
            var newObject = eval(`new ${this.rowObjectType}();`);
            newObject.addVars(this.matchingRows[i]);
            //newObject.setParentLiveTable(this.parentLiveTable);

            this.rVar.push(newObject);
            //this.parentLiveTable.subscribe()
            newObject.subscribeToDelete((record, changeCode) =>
                this.parentLiveTable.triageRecordSignal(record, changeCode)
            );
            newObject.subscribeToChanges((record, changeCode) =>
                this.parentLiveTable.triageRecordSignal(record, changeCode)
            );
        }
        this.requestFinishedFlag = true;

        this.parentLiveTable.emit();
    }
}

class CardDatapointFromLive {
    constructor(category, rowObject, parameter) {
        this.category = category;

        this.setColumnCodeString = this.setColumnCodeString.bind(this);
        this.setRecordIDString = this.setRecordIDString.bind(this);
        this.setTableCodeString = this.setTableCodeString.bind(this);

        this.rebuild = this.rebuild.bind(this);
        this.forceRebuild = this.forceRebuild.bind(this);

        this.forcePush = this.forcePush.bind(this);
        this.addToElement = this.addToElement.bind(this);

        this.returnValueAsArray = this.returnValueAsArray.bind(this);

        if (rowObject[parameter]) {
            this.liveCell = rowObject[parameter];

            this.value = this.liveCell.getValue();
            this.liveCell.subscribe((value) => this.forceRebuild(value));
            this.string = this.category + ": " + this.value;

            this.el = document.createElement("div");
            this.el.className += "cardDatapoint";
            this.el.innerHTML = this.string;

            //this.updateValue = this.updateValue.bind(this);
        }
    }

    setColumnCodeString(columnCodeString) {
        this.columnCodeString = columnCodeString;
    }

    setRecordIDString(recordIDString) {
        this.recordIDString = recordIDString;
    }

    setTableCodeString(tableCodeString) {
        this.tableCodeString = tableCodeString;
    }
    // (tableCodeString,recordIDString,columnCodeString,updatedValue)

    rebuild() {
        this.string = this.category + ": " + this.value;
        this.el.innerHTML = this.string;
    }

    unsubscribe() {
        this.liveCell.unsubscribe(this);
        this.liveCell = null;
    }

    forceRebuild(value) {
        if (value.isArray) {
            value = vlaue.toString();
        }
        this.value = value;
        this.string = this.category + ": " + this.value;
        this.el.innerHTML = this.string;
    }

    forcePush(value) {
        if (value.isArray) {
        } else {
        }
    }

    addToElement(element) {
        element.appendChild(this.el);
    }

    returnValueAsArray() {
        let newArray = this.value.split(",");
        return newArray;
    }

    //updateValue(value) {
    //    this.liveCell.setValue(value);
    //}
}

class LiveAggregation {
    constructor(parentLiveTable, columnName) {
        this.updateValue = this.updateValue.bind(this);
        this.emit = this.emit.bind(this);
        this.subscribe = this.subscribe.bind(this);

        this.parentLiveTable = parentLiveTable;

        this.columnName = columnName;
        this.subscribers = [];
    }

    updateValue(value) {
        if (this.value != value) {
            this.value = value;
            this.emit();
        }

    }

    emit() {
        this.subscribers.forEach((subscriber) => subscriber(this.value));
    }

    subscribe(callback) {
        this.subscribers.push(callback);
        callback(this.value);
    }
}

class Sum extends LiveAggregation {
    constructor(parentLiveTable, columnName) {
        super(parentLiveTable, columnName);
        this.aggregate = this.aggregate.bind(this);
        this.parentLiveTable.aggregations.push(this);
        parentLiveTable.subscribe((rows) => this.aggregate(rows));
    }

    aggregate(rows) {
        let sum = 0;

        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];
            sum += Number(row[this.columnName].value);
        }

        this.updateValue(sum);
    }
}

class Average extends LiveAggregation {
    constructor(parentLiveTable, columnName) {
        super(parentLiveTable, columnName);
        this.aggregate = this.aggregate.bind(this);
        this.parentLiveTable.aggregations.push(this);
        parentLiveTable.subscribe((rows) => this.aggregate(rows));
    }

    aggregate(rows) {
        let sum = 0;
        let count = 0;
        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];

            sum += Number(row[this.columnName].value);
            count++;
        }
        if (count != 0) {
            let average = sum / count;
            this.updateValue(average);
        }
    }
}

class UniqueValues extends LiveAggregation {
    constructor(parentLiveTable, columnName) {
        super(parentLiveTable, columnName);
        this.aggregate = this.aggregate.bind(this);
        this.value = [];
        this.parentLiveTable.aggregations.push(this);
        parentLiveTable.subscribe((rows) => this.aggregate(rows));
    }

    aggregate(rows) {
        let uniqueValues = [];
        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];

            if (uniqueValues.includes(row[this.columnName].value)) {
            } else {
                uniqueValues.push(row[this.columnName].value);
            }
        }

        this.updateValue(uniqueValues);
    }
}

class NumberRowsMatchingValue extends LiveAggregation {
    constructor(parentLiveTable, columnName, checkValue) {
        super(parentLiveTable, columnName);
        this.checkValue = checkValue;
        this.aggregate = this.aggregate.bind(this);
        this.value = [];
        this.parentLiveTable.aggregations.push(this);
        parentLiveTable.subscribe((rows) => this.aggregate(rows));
    }

    aggregate(rows) {
        let count = 0;
        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];
            if (row[this.columnName].value == this.checkValue) {
                count += 1;
            }
        }

        this.updateValue(count);
    }
}

class RowsMatchingValue extends LiveAggregation {
    constructor(parentLiveTable, columnName, checkValue) {
        super(parentLiveTable, columnName);
        this.checkValue = checkValue;
        this.aggregate = this.aggregate.bind(this);
        this.value = [];
        this.parentLiveTable.aggregations.push(this);
        parentLiveTable.subscribe((rows) => this.aggregate(rows));
    }

    aggregate(rows) {
        let matchingRows = [];
        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];
            if (row[this.columnName].value == this.checkValue) {
                matchingRows.push(row);
            }
        }
        this.updateValue(matchingRows);
    }
}



class RecordOfID extends LiveAggregation {
    constructor(parentLiveTable, idValue) {
        super(parentLiveTable, "id");
        this.checkValue = idValue;
        this.aggregate = this.aggregate.bind(this);
        this.value = null;
        this.parentLiveTable.aggregations.push(this);
        parentLiveTable.subscribe((rows) => this.aggregate(rows));
    }

    aggregate(rows) {
        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];
            if (row[this.columnName].value == this.checkValue) {
                this.updateValue(rows[i]);
            }
        }
    }
}
class RowsMatchingObjectParamValue extends LiveAggregation {
    constructor(parentLiveTable, columnName, checkObject, checkParam) {
        super(parentLiveTable, columnName);
        this.checkObject = checkObject;
        this.checkParam = checkParam;
        this.aggregate = this.aggregate.bind(this);
        this.value = [];
        this.parentLiveTable.aggregations.push(this);
        parentLiveTable.subscribe((rows) => this.aggregate(rows));
    }

    aggregate(rows) {
        let matchingRows = [];
        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];
            if (row[this.columnName].value == this.checkObject[this.checkParam].value) {
                matchingRows.push(row);
            }
        }

        this.updateValue(matchingRows);
    }
}

class RowListFromDelimStringCardDatapoint {
    constructor(
        rowObjectType,
        tableCodeString,
        staticColumnArray,
        columnForInputArray,
        staticRequestValueArray,
        inputValueListCardDatapoint,
        staticComparisonFunctionArray,
        inputValueComparisonFunction
    ) {
        this.rowList = [];
        this.rowObjectType = rowObjectType;
        this.tableCodeString = tableCodeString;
        this.staticColumnArray = staticColumnArray;
        this.columnForInputArray = columnForInputArray;
        this.staticRequestValueArray = staticRequestValueArray;
        this.inputValueListCardDatapoint = inputValueListCardDatapoint;
        this.staticComparisonFunctionArray = staticComparisonFunctionArray;
        this.inputValueComparisonFunction = inputValueComparisonFunction;

        this.el = document.createElement("div");
        this.el.className += "rowContainer";
        this.string = this.rowObjectType + "s: ";
        this.el.innerHTML = this.string;

        this.addToElement = this.addToElement.bind(this);
        this.sendRequests = this.sendRequests.bind(this);
        this.requestInterval = setInterval(this.sendRequests, 200);

        this.allFinishedFlag = false;
        //this.allFinishedInterval = setInterval(checkAll, 200);
    }

    sendRequests() {
        if (this.inputValueListCardDatapoint.length != 0) {
            this.inputValues = this.inputValueListCardDatapoint;
            let flagWatcher = new ChildFlagConnections(this, "allFinishedFlag");
            for (let i = 0; i < this.inputValues.length; i++) {
                let newObject = eval(`new ${this.rowObjectType}();`);
                let requestColumnArray = this.staticColumnArray.concat(
                    this.columnForInputArray
                );

                let requestValueArray = this.staticRequestValueArray.concat(
                    this.inputValues[i]
                );

                let comparisonFunctionArray = this.staticComparisonFunctionArray.concat(
                    this.inputValueComparisonFunction
                );

                let newRowRequest = new SingleReturnRequestWhereColumnFromCardDatapoint(
                    this.rowObjectType,
                    newObject,
                    this.tableCodeString,
                    requestColumnArray,
                    requestValueArray,
                    comparisonFunctionArray
                );

                newObject.addToElement(this.el);
                flagWatcher.addChildFlag(newRowRequest, "requestFinishedFlag");
                this.rowList.push(newObject);
            }

            flagWatcher.startChecking();

            clearInterval(this.requestInterval);
        }
    }

    //checkAll() {
    //    flagWatcher = new ChildFlagConnections(this,"allFinishedFlag");
    //    for (let i = 0; i < this.rowList.length; i++) {
    //        flagWatcher.addChildFlag(this.rowList[i],"finishedLoadingFlag");
    //    }
    //    flagWatcher.startChecking();

    //}

    addToElement(element) {
        element.appendChild(this.el);
    }
}

class Project extends LiveRecord {
    constructor() {
        super();
        this.tableKeyCode = "LBktEnbDWtPGKdrrp";

        this.columns = [];
        this.id = new LiveCell(this.tableKeyCode, "id");
        this.columns.push(this.id);
        this.productType = new LiveCell(this.tableKeyCode, "lgzpi_product_type");
        this.columns.push(this.productType);
        this.customer = new LiveCell(this.tableKeyCode, "teiiv_customer_site");
        this.columns.push(this.customer);
        this.projectStatus = new LiveCell(this.tableKeyCode, "tdmsx_status");
        this.columns.push(this.projectStatus);
    }
}

class Color extends LiveRecord {
    constructor() {
        super();
        this.tableKeyCode = "G4GhtvuLpAqXCbWue";

        this.columns = [];
        this.id = new LiveCell(this.tableKeyCode, "id");
        this.columns.push(this.id);
        this.r = new LiveCell(this.tableKeyCode, "mdwvs_color", "r");
        this.columns.push(this.r);
        this.g = new LiveCell(this.tableKeyCode, "mdwvs_color", "g");
        this.columns.push(this.g);
        this.b = new LiveCell(this.tableKeyCode, "mdwvs_color", "b");
        this.columns.push(this.b);
        this.a = new LiveCell(this.tableKeyCode, "mdwvs_color", "a");
        this.columns.push(this.a);

    }
}


class TSN extends LiveRecord {
    constructor() {
        super();
        this.tableKeyCode = "fabuBr9PMMwHunv6n";

        this.columns = [];
        this.id = new LiveCell(this.tableKeyCode, "id");
        this.columns.push(this.id);
        this.project = new LiveCell(this.tableKeyCode, "upcqk_project_number");
        this.columns.push(this.project);
        this.masterTraveler = new LiveCell(this.tableKeyCode, "gvuqy_traveler_name_no");
        this.columns.push(this.masterTraveler);
        this.status = new LiveCell(this.tableKeyCode, "aqtou_status");
        this.columns.push(this.status);
    }
}

class MasterTask extends LiveRecord {
    constructor() {
        super();
        this.tableKeyCode = "eTAvZPcDHDsRrWQdZ";

        this.columns = [];
        this.id = new LiveCell(this.tableKeyCode, "id");
        this.columns.push(this.id);
        this.desc = new LiveCell(this.tableKeyCode, "huygv_description");
        this.columns.push(this.desc);
        this.operatingGroup = new LiveCell(this.tableKeyCode, "orero_operating_group");
        this.columns.push(this.operatingGroup);
        this.project = new LiveCell(this.tableKeyCode, "qkfaf_project");
        this.columns.push(this.project);
        this.masterTraveler = new LiveCell(this.tableKeyCode, "sgagi_master_traveler");
        this.columns.push(this.masterTraveler);
        this.opFamily = new LiveCell(this.tableKeyCode, "rfktf_op_family");
        this.columns.push(this.opFamily);
        this.standardTime = new LiveCell(this.tableKeyCode, "jmixs_standard_time");
        this.columns.push(this.standardTime);
    }
}

class TaskAssignment extends LiveRecord {
    static instances = [];

    constructor() {
        super();
        this.tableKeyCode = "aNdDh4czBG5J4kX7N";


        this.columns = [];
        this.id = new LiveCell(this.tableKeyCode, "id");
        this.id.subscribe((record) => this.emitChanged(record));
        this.columns.push(this.id);
        this.taskID = new LiveCell(this.tableKeyCode, "oiqoc_task_id");
        this.taskID.subscribe((record) => this.emitChanged(record));
        this.columns.push(this.taskID);
        this.assignedOperator = new LiveCell(this.tableKeyCode, "wadgn_assigned_operator");
        this.assignedOperator.subscribe((record) => this.emitChanged(record));
        this.columns.push(this.assignedOperator);
        this.dateAssignedFor = new LiveCell(this.tableKeyCode, "zxxfx_date_assigned_for");
        this.dateAssignedFor.subscribe((record) => this.emitChanged(record));
        this.columns.push(this.dateAssignedFor);
        this.assignmentPerformedBy = new LiveCell(this.tableKeyCode, "smnun_assignment_performed_by");
        this.assignmentPerformedBy.subscribe((record) => this.emitChanged(record));
        this.columns.push(this.assignmentPerformedBy);
        this.timeOfAssignment = new LiveCell(this.tableKeyCode, "dxngn_time_of_assignment");
        this.timeOfAssignment.subscribe((record) => this.emitChanged(record));
        this.columns.push(this.timeOfAssignment);
        this.status = new LiveCell(this.tableKeyCode, "fqctj_status");
        this.status.subscribe((record) => this.emitChanged(record));
        this.columns.push(this.status);



        this.newFormInclusions = [
            { column: "taskID", displayName: "Task ID", inputType: "TableDrivenRecordSelect", includeInID: true, multiplicity: false },
            { column: "assignedOperator", displayName: "Assigned Operator", inputType: "TableDrivenMultiSelect", includeInID: true, multiplicity: true },
            { column: "dateAssignedFor", displayName: "Task Assignment Date/Time", inputType: "DatePicker", includeInID: false, multiplicity: false },
            { column: "timeOfAssignment", displayName: "Task Assignment Date/Time", inputType: "CurrentTime", includeInID: true, multiplicity: false },
            { column: "assignmentPerformedBy", displayName: "Task Assignment Date/Time", inputType: "LoggedInUser", includeInID: false, multiplicity: false },
            { column: "status", displayName: "null", inputType: "Autofill", includeInID: false, multiplicity: false, autofillAnswer: "Open" }
        ];


        this.editFormInclusions = [
            { column: "taskID", displayName: "Task ID", inputType: "KeepSame", includeInID: false, multiplicity: false },
            { column: "assignedOperator", displayName: "Assigned Operator", inputType: "KeepSame", includeInID: false, multiplicity: false },
            { column: "dateAssignedFor", displayName: "Task Assignment Date/Time", inputType: "DatePicker" },
            { column: "timeOfAssignment", displayName: "Task Assignment Date/Time", inputType: "CurrentTime" },
            { column: "assignmentPerformedBy", displayName: "Assignment Performed By", inputType: "LoggedInUser" },
            { column: "status", displayName: "Status", inputType: "KeepSame", includeInID: false, multiplicity: false }
        ];
    }
}


class Task extends LiveRecord {
    static instances = [];

    constructor() {
        super();
        this.tableKeyCode = "GZnXDFEjjYhEHc4Cf";

        this.columns = [];
        this.id = new LiveCell(this.tableKeyCode, "id");
        this.columns.push(this.id);
        this.masterTraveler = new LiveCell(this.tableKeyCode, "hbrjg_master_traveler");
        this.columns.push(this.masterTraveler);
        this.opCode = new LiveCell(this.tableKeyCode, "wyjjn_point_operation");
        this.columns.push(this.opCode);
        this.tsn = new LiveCell(this.tableKeyCode, "fpoyg_traveler_serial_number");
        this.columns.push(this.tsn);
        this.priority = new LiveCell(this.tableKeyCode, "tibre_priority");
        this.columns.push(this.priority);
        this.desc = new LiveCell(this.tableKeyCode, "gkhwq_description");
        this.columns.push(this.desc);

        /*
        this.numberOfAssignments = new LiveValue(null);

        this.assignmentsAgg = new RowsMatchingObjectParamValue(
            allAssignments,
            "taskID",
            this,
            "id"
        );
        this.assignmentsAgg.subscribe((values) => this.updateAssignments(values));
    }


    updateAssignments(assignments) {
        if (this.numberOfAssignments.value != assignments.length) {
            this.numberOfAssignments.setValue(assignments.length);
            //this.emitChanged();
        }


    }

    */
    }
}

class PrivilegeDefinition extends LiveRecord {
    constructor() {
        super();

        this.columns = [];
        this.id = new LiveCell(this.tableKeyCode, "id");
        this.columns.push(this.id);
        this.process = new LiveCell(this.tableKeyCode, "kbybu_process");
        this.columns.push(this.process);
        this.transferMethod = new LiveCell(this.tableKeyCode, "wreoz_transfer_method");
        this.columns.push(this.transferMethod);
        this.pNumber = new LiveCell(this.tableKeyCode, "sctvi_base_metal");
        this.columns.push(this.pNumber);
        this.fNumber = new LiveCell(this.tableKeyCode, "dsxwz_filler_metal_f");
        this.columns.push(this.fNumber);
        this.position = new LiveCell(this.tableKeyCode, "nfddr_position");
        this.columns.push(this.position);
    }
}

class User extends LiveRecord {
    constructor() {
        super();

        this.columns = [];
        this.id = new LiveCell(this.tableKeyCode, "id");
        this.columns.push(this.id);
        this.name = new LiveCell(this.tableKeyCode, "name", "full");
        this.columns.push(this.name);
    }
}

class UserPrivilege extends LiveRecord {
    constructor() {
        super();
        this.tableKeyCode = "ZyxvNtZdg3RrY9sGu";

        this.columns = [];
        this.id = new LiveCell(this.tableKeyCode, "id");
        this.columns.push(this.id);
        this.privilegedUser = new LiveCell(this.tableKeyCode, "yyaze_user");
        this.columns.push(this.privilegedUser);
        this.qualType = new LiveCell(this.tableKeyCode, "nxysy_qualification_type");
        this.columns.push(this.qualType);
        this.status = new LiveCell(this.tableKeyCode, "oicif_granted_revoked");
        this.columns.push(this.status);
        this.privilegeID = new LiveCell(this.tableKeyCode, "kmvoe_page_category");
        this.columns.push(this.privilegeID);
    }


    matchesProcedure(procedure) {
        if (this.privDef != null) {
            if (this.privDef.id.value != null) {
                if (this.privDef.process.value != procedure.process.value) {
                    return false;
                }
                return true;
            }
        } else {
            return false;
        }
    }
}

class WeldJoint extends LiveRecord {
    static instances = [];

    constructor() {
        super();
        this.tableKeyCode = "LNy4QZwb5zT7qqchp";

        this.columns = [];
        this.id = new LiveCell(this.tableKeyCode, "id");
        this.columns.push(this.id);
        this.procedureListString = new LiveCell(this.tableKeyCode, "foawv_accepted_processes");
        this.columns.push(this.procedureListString);
        this.baseMaterialListString = new LiveCell(this.tableKeyCode, "hudhz_material_list");
        this.columns.push(this.baseMaterialListString);
        this.baseMaterialThicknessListString = new LiveCell(this.tableKeyCode, "roacl_base_material_thickness_list");
        this.columns.push(this.baseMaterialThicknessListString);
        this.jointType = new LiveCell(this.tableKeyCode, "zykhd_joint_type");
        this.columns.push(this.jointType);
        this.weldSize = new LiveCell(this.tableKeyCode, "hobjj_weld_size");
        this.columns.push(this.weldSize);
        this.jointNumber = new LiveCell(this.tableKeyCode, "fljbr_weld_joint_number");
        this.columns.push(this.jointNumber);
    }
}

class WeldProcedure extends LiveRecord {
    constructor() {
        super();
        this.tableKeyCode = "wiMd444nuuMXz3M9Y";

        this.columns = [];
        this.id = new LiveCell(this.tableKeyCode, "id");
        this.columns.push(this.id);
        this.procedureNumber = new LiveCell(this.tableKeyCode, "uasff_procedure_number");
        this.columns.push(this.procedureNumber);
        this.revisionNumber = new LiveCell(this.tableKeyCode, "xklqf_revision_number");
        this.columns.push(this.revisionNumber);
        this.process = new LiveCell(this.tableKeyCode, "mwowq_process");
        this.columns.push(this.process);
        this.currentType = new LiveCell(this.tableKeyCode, "xvkbb_current_type");
        this.columns.push(this.currentType);
        this.transferMode = new LiveCell(this.tableKeyCode, "ntpyz_transfer_mode");
        this.columns.push(this.transferMode);
        this.pulseAllowed = new LiveCell(this.tableKeyCode, "qctny_pulse_allowed");
        this.columns.push(this.pulseAllowed);
        this.sttAllowed = new LiveCell(this.tableKeyCode, "aphti_stt_allowed");
        this.columns.push(this.sttAllowed);
        this.automationLevels = new LiveCell(this.tableKeyCode, "jgxlm_automation_levels");
        this.columns.push(this.automationLevels);
        this.maxRootSpacing = new LiveCell(this.tableKeyCode, "psrfn_max_root_spacing");
        this.columns.push(this.maxRootSpacing);
        this.jointTypes = new LiveCell(this.tableKeyCode, "mlijq_joint_types");
        this.columns.push(this.jointTypes);
        this.backing = new LiveCell(this.tableKeyCode, "fnefq_backing");
        this.columns.push(this.backing);
        this.backingTypes = new LiveCell(this.tableKeyCode, "nyftf_backing_types");
        this.columns.push(this.backingTypes);
        this.grooveThicknessaMinimum = new LiveCell(this.tableKeyCode, "ltmjm_groove_thickness_minimum");
        this.columns.push(this.grooveThicknessaMinimum);
        this.filletThicknessMinimum = new LiveCell(this.tableKeyCode, "hizzi_fillet_thickness_minimum");
        this.columns.push(this.filletThicknessMinimum);
        this.fillerDiameterMinimum = new LiveCell(this.tableKeyCode, "iqeda_filler_diameter_minimum");
        this.columns.push(this.fillerDiameterMinimum);
        this.fillerDiameterMaximum = new LiveCell(this.tableKeyCode, "rtqik_filler_diameter_maximum");
        this.columns.push(this.fillerDiameterMaximum);
        this.passThicknessMaximum = new LiveCell(this.tableKeyCode, "zfdoi_maximum_pass_thickness");
        this.columns.push(this.passThicknessMaximum);
        this.tungstenTypes = new LiveCell(this.tableKeyCode, "zvqqc_gtaw_tungsten_types");
        this.columns.push(this.tungstenTypes);
        this.tungstenDiameterMinimum = new LiveCell(this.tableKeyCode, "enpvz_gtaw_tungsten_diameter_minimum");
        this.columns.push(this.tungstenDiameterMinimum);
        this.tungstenDiameterMaximum = new LiveCell(this.tableKeyCode, "aegcz_gtaw_tungsten_diameter_maximum");
        this.columns.push(this.tungstenDiameterMaximum);
        this.directions = new LiveCell(this.tableKeyCode, "knytp_directions");
        this.columns.push(this.directions);
        this.positions = new LiveCell(this.tableKeyCode, "zqyjk_positions");
        this.columns.push(this.positions);
        this.maxInterpassTemp = new LiveCell(this.tableKeyCode, "juhfj_maximum_interpass_temperature_f");
        this.columns.push(this.maxInterpassTemp);
        this.fNumber = new LiveCell(this.tableKeyCode, "rucml_f_number");
        this.columns.push(this.fNumber);
        this.pNumber = new LiveCell(this.tableKeyCode, "wijat_base_materials");
        this.columns.push(this.pNumber);
        this.shieldingGas = new LiveCell(this.tableKeyCode, "fkgjt_shielding_gas");
        this.columns.push(this.shieldingGas);

    }
}

function rowObjectByTypeID(type, id) {
    let noReturn = true;
    let objectList = eval(`${type}.instances`);
    for (let i = 0; i < objectList.length; i++) {
        if (objectList[i] != null) {
            if (objectList[i].id.value == id) {
                noReturn = false;
                return objectList[i];
            }
        }
    }
    if (noReturn == true) {
        return null;
    }
}

class Card {
    constructor() {
        this.addButtonFeature = this.addButtonFeature.bind(this);
        this.setTitle = this.setTitle.bind(this);
        this.hide = this.hide.bind(this);
        this.unhide = this.unhide.bind(this);
        this.emitClick = this.emitClick.bind(this);
        this.subscribeToClick = this.subscribeToClick.bind(this);
        this.setParentTableWindow = this.setParentTableWindow.bind(this);

        this.setStaticContainerFlexDirection =
            this.setStaticContainerFlexDirection.bind(this);
        this.setCollapsibleContainerFlexDirection =
            this.setCollapsibleContainerFlexDirection.bind(this);
        this.setOverallFlexDirection = this.setOverallFlexDirection.bind(this);

        this.openTargetDetailPage = this.openTargetDetailPage.bind(this);

        this.leadRow = null;

        this.el = document.createElement("div");
        this.el.className += "DropCard";

        this.headerEl = document.createElement("div");
        this.headerEl.className += "DropCardHeader";
        this.el.appendChild(this.headerEl);

        this.titleEl = document.createElement("div");
        this.titleEl.className += "DropCardTitle";
        this.headerEl.appendChild(this.titleEl);

        this.staticContainer = document.createElement("div");
        this.staticContainer.className += "DropCardStaticContainer";
        this.el.appendChild(this.staticContainer);

        this.collapsibleContainer = document.createElement("div");
        this.collapsibleContainer.className += "DropCardCollapsibleContainer";

        this.collapsibleContainer.style.display = "none";

        this.parentObjectType = null;
        this.parentObjectID = null;

        this.el.appendChild(this.collapsibleContainer);
        this.el.addEventListener("click", this.emitClick);
        this.el.style.backgroundColor = "white";

        this.intervals = [];

        this.hidden = false;
        this.el.style.display = "flex";

        this.datapoints = [];
        this.buttons = [];
        this.clickSubscribers = [];
    }

    emitClick() { this.clickSubscribers.forEach((subscriber) => subscriber(this)); }

    subscribeToClick(callback) {
        this.clickSubscribers.push(callback);

    }

    generateEditForm() {

        let erf = new EditRecordForm(this.targetRow);
        erf.setRecordType(this.targetRow.constructor.name);
        erf.setParentTableWindow(this.parentTableWindow);

        erf.buildForm();

        erf.open();
    }

    addRowDetailButton(title) {
        let newButton = document.createElement("div");
        newButton.className += "isoButton";
        newButton.innerHTML = title;
        this.headerEl.appendChild(newButton);
        newButton.addEventListener("click", this.openTargetDetailPage);
    }


    setTargetRow(row) {
        this.targetRow = row;
    }

    setParentTableWindow(tableWindow) {
        this.parentTableWindow = tableWindow;
    }

    setDetailPageType(detailPageType) {
        this.detailPageType = detailPageType;
    }

    openTargetDetailPage() {
        let detailPage = eval(`new ${this.detailPageType}();`);
        detailPage.setSubjectRow(this.targetRow);
        //detailPage.setReturnLocation(this);
        detailPage.loadCardDatapoints();
    }

    addButtonFeature(
        title,
        buttonFunctionObject,
        buttonFunctionMethodString,
        buttonFunctionParams
    ) {
        let newButton = document.createElement("div");
        newButton.className += "isoButton";
        newButton.innerHTML = title;
        this.headerEl.appendChild(newButton);

        newButton.addEventListener(
            "click",
            buttonFunctionObject[buttonFunctionMethodString](buttonFunctionParams)
        );
    }

    addDatapoint(rowObject, parameter, displayName) {
        let newDatapoint = new CardDatapointFromLive(
            displayName,
            rowObject,
            parameter
        );
        if (newDatapoint.liveCell) {
            this.datapoints.push(newDatapoint);
            this.staticContainer.appendChild(newDatapoint.el);
        }
    }

    setTitle(titleString) {
        this.titleEl.innerHTML = titleString;
    }

    setStaticContainerFlexDirection(direction) {
        this.staticContainer.style.display = "flex";
        this.staticContainer.style.flex_direction = direction;

        //if (this.hidden == true) {
        //    this.staticContainer.style.display = "none";
        //}
    }

    setCollapsibleContainerFlexDirection(direction) {
        this.collapsibleContainer.style.display = "flex";
        this.collapsibleContainer.style.flex_direction = direction;
        //if(this.hidden == true) {
        //    this.collapsibleContainer.style.display = "none";
        //}
    }

    setOverallFlexDirection(direction) {
        this.el.style.display = "flex";
        this.el.style.flex_direction = direction;

        if (this.hidden == true) {
            this.el.style.display = "none";
        }
    }

    setParentObjectType(objectType) {
        this.parentObjectType = objectType;
    }

    setParentObjectID(id) {
        this.parentObjectID = id;
    }

    hide() {
        this.hidden = true;
        this.el.style.display = "none";
    }

    unhide() {
        this.hidden = false;
        this.el.style.display = "flex";
    }

    crashout() {
        for (let i = 0; i < this.buttons.length; i++) {
            this.buttons[i].removeEventListeners();
            this.buttons[i].el = null;
            this.buttons[i] = null;
        }
        for (let i = 0; i < this.datapoints.length; i++) {
            this.datapoints[i].unsubscribe();
            this.datapoints[i] = null;
        }
        this.buttons = null;
        this.datapoints = null;

        //let new_element = this.el.cloneNode(true);
        //this.el.parentNode.replaceChild(new_element, this.el);

        this.el.parentElement.removeChild(this.el);

        this.hide();

        this.el = null;
    }
}

class RequestFilterCriteria {
    constructor(columnString, functionTypeString, valueString) {
        this.columnString = columnString;
        this.functionTypeString = functionTypeString;
        this.valueString = valueString;
    }
}

class EmptyTableWindow {
    constructor() {
        this.el = document.createElement("div");
        this.el.className += "TableWindow";

        this.titleRow = document.createElement("div");
        this.title = document.createElement("div");

        this.titleRow.appendChild(this.title);
        this.el.appendChild(this.titleRow);

        this.requestReturnArray = [];
        this.columnArray = [];
        this.functionArray = [];
        this.valueArray = [];

        this.cardArray = [];
    }
}

class TableWindowFromLiveTable extends EmptyTableWindow {
    constructor() {
        super();
        this.addRequestCriteria = this.addRequestCriteria.bind(this);
        //this.addButtons = this.addButtons.bind(this);
        //this.addRowDetailButtons = this.addRowDetailButtons.bind(this);
        this.setTitle = this.setTitle.bind(this);
        this.turnDroppingOn = this.turnDroppingOn.bind(this);
        this.turnDroppingOff = this.turnDroppingOff.bind(this);
        this.toggle = this.toggle.bind(this);
        this.open = this.open.bind(this);
        this.close = this.close.bind(this);
        this.addAggregationToSummary = this.addAggregationToSummary.bind(this);
        this.returnArrayNotHidden = this.returnArrayNotHidden.bind(this);
        this.returnNonHiddenCardsForName =
            this.returnNonHiddenCardsForName.bind(this);
        this.setBodyPixelHeight = this.setBodyPixelHeight.bind(this);
        //this.addRowDetailButtonsActual = this.addRowDetailButtonsActual.bind(this);

        this.setStaticContainerFlexDirection =
            this.setStaticContainerFlexDirection.bind(this);
        this.setCollapsibleContainerFlexDirection =
            this.setCollapsibleContainerFlexDirection.bind(this);
        this.setOverallFlexDirection = this.setOverallFlexDirection.bind(this);
        this.setTableBodyFlexDirection = this.setTableBodyFlexDirection.bind(this);

        //this.filterItemsByColumnValue = this.filterItemsByColumnValue.bind(this);
        this.findDropCardForRow = this.findDropCardForRow.bind(this);
        this.addButtonToSummaryLine = this.addButtonToSummaryLine.bind(this);
        this.addPremadeButtonToSummaryLine =
            this.addPremadeButtonToSummaryLine.bind(this);
        this.setSubjectID = this.setSubjectID.bind(this);
        //this.runPostFunctions = this.runPostFunctions.bind(this);
        this.addPostRequestFilter = this.addPostRequestFilter.bind(this);
        this.addPostRequestFunction = this.addPostRequestFunction.bind(this);
        //this.addDeleteButtonToEveryRow = this.addDeleteButtonToEveryRow.bind(this);

        this.omitSummaryDrop = this.omitSummaryDrop.bind(this);

        this.titleEl = document.createElement("div");
        this.titleEl.className += "ViewWindowTitle";

        this.summaryDrop = new Card();
        this.summaryDrop.setTitle("Summary");
        this.summaryDrop.setCollapsibleContainerFlexDirection("column");

        this.bodyEl = document.createElement("div");
        this.bodyEl.className += "TableBody";
        this.bodyEl.style.overflow = "scroll";

        this.rowContainer = document.createElement("div");
        //this.bodyEl.appendChild(this.summaryDrop.el);
        this.bodyEl.appendChild(this.rowContainer);

        this.el.appendChild(this.titleEl);
        //this.el.appendChild(this.summaryEl);

        this.el.appendChild(this.bodyEl);

        this.returnType = "DropCard";

        this.cardArray = [];

        this.postFilters = [];
        this.inclusions = [];
        this.features = [];
        this.postFunctions = [];

        this.currentRows = [];

        this.liveFunctionalityActive = true;

        this.setParentLiveTable = this.setParentLiveTable.bind(this);
        this.updateTableWindow = this.updateTableWindow.bind(this);
    }

    setParentLiveTable(parentLiveTable) {
        this.parentLiveTable = parentLiveTable;
        this.parentLiveTable.subscribe((rows) => this.updateTableWindow(rows));

    }



    updateTableWindow(rows) {
        this.currentRows = rows;

        let beforeDeleteEls = this.rowContainer.children.length;

        for (let p = 0; p < this.cardArray.length; p++) {
            this.cardArray[p].targetRow = null;

            this.cardArray[p].crashout();
            this.cardArray[p] = null;
            //this.cardArray.pop(this.cardArray[p]);
        }

        this.cardArray = [];

        let afterDeleteEls = this.rowContainer.children.length;


        for (let i = 0; i < rows.length; i++) {
            var rowValid = true;
            if (rows[i].id.value == null) {

            }
            else {
                for (let j = 0; j < this.postFilters.length; j++) {
                    if (this.postFilters[j].comparisonType == "EQUAL") {
                        if (
                            rows[i][this.postFilters[j].columnName].value !=
                            this.postFilters[j].columnValue
                        ) {
                            rowValid = false;
                        }
                    } else if (this.postFilters[j].comparisonType == "GREATERTHAN") {
                        if (
                            rows[i][this.postFilters[j].columnName].value <=
                            this.postFilters[j].columnValue
                        ) {
                            rowValid = false;
                        }
                    } else if (this.postFilters[j].comparisonType == "LESSTHAN") {
                        if (
                            rows[i][this.postFilters[j].columnName].value >=
                            this.postFilters[j].columnValue
                        ) {
                            rowValid = false;
                        }
                    }
                }
            }


            if (rowValid == true) {
                let testCard = new Card();
                testCard.setParentTableWindow(this);
                testCard.setTitle(rows[i].constructor.name);
                testCard.setTargetRow(rows[i]);
                testCard.setParentObjectType(rows[i].constructor.name);
                //testCard.setParentObjectID(this.requestReturnArray[i].id);

                for (let k = 0; k < this.inclusions.length; k++) {
                    if (this.inclusions[k].sourceID) {
                        let rowObject =
                            this.inclusions[k].sourceTable.activeRows[
                            this.inclusions[k].sourceTable.activeRows.findIndex(
                                (obj) =>
                                    obj[this.inclusions[k].objectSearchParameter].value ===
                                    rows[i][this.inclusions[k].sourceID].value
                            )
                            ];
                        if (rowObject) {
                            if (rowObject[this.inclusions[k].columnString]) {
                                testCard.addDatapoint(
                                    rowObject,
                                    this.inclusions[k].columnString,
                                    this.inclusions[k].displayName
                                );
                            }
                        } else {
                            //setTimeout(this.parentLiveTable.emit, 2000);
                        }
                    } else {
                        testCard.addDatapoint(
                            rows[i],
                            this.inclusions[k].columnString,
                            this.inclusions[k].displayName
                        );
                    }

                    //let rowType = this.inclusions[k].columnString;
                }

                this.cardArray.push(testCard);



                if (this.features.includes("clickListener")) {
                    testCard.subscribeToClick((card) =>
                        this.claimSelectedCard(card)
                    );
                }

                if (this.features.includes("editRecordButton")) {
                    let editButton = new EditRowButton(testCard);
                    testCard.headerEl.appendChild(editButton.el);
                    testCard.buttons.push(editButton);
                }

                if (this.features.includes("rowDeleteButton")) {
                    let deleteButton = new DeleteRowButton(rows[i]);
                    testCard.headerEl.appendChild(deleteButton.el);
                    testCard.buttons.push(deleteButton);
                }


                if (this.features.includes("manageTask")) {
                    testCard.addRowDetailButton("Manage Task");
                    testCard.setDetailPageType("TaskScheduleManager");
                }

                this.rowContainer.appendChild(testCard.el);
            }
        }

        if (this.features.includes("disconnectFromLiveTable")) {
            if (this.cardArray.length > 0) {
                this.parentLiveTable.unsubscribe();
            }
        }

        let cardArray = this.cardArray.length;
        let afterAll = this.rowContainer.children.length;
    }

    addPostRequestFilter(columnName, columnValue, comparisonType) {
        let newFilter = {
            columnName: columnName,
            columnValue: columnValue,
            comparisonType: comparisonType,
        };
        this.postFilters.push(newFilter);
    }

    addPostRequestFunction(functionName, functionParamArray) {
        let newFunction = {
            functionName: functionName,
            functionParamArray: functionParamArray,
        };
        this.postFunctions.push(newFunction);
    }

    addRecord(record) {
        if (this.tableKeyCode != null) {
            let requestBody = record;

            let requestString = "https://orano.tulip.co/api/v3/tables/";
            requestString += this.tableKeyCode;
            requestString += "/records";

            let tableRequest = new XMLHttpRequest();
            tableRequest.open("POST", requestString);
            tableRequest.setRequestHeader(
                "Authorization",
                authKey
            );

            //this.tableRequest.responseType = "json";
            tableRequest.send(JSON.stringify(requestBody));

            //this.forceRebuild(updatedValue);
        }
    }

    openAddRecordForm() {
        let newAddRecordForm = new NewRecordForm();
        newAddRecordForm.setRecordType(this.parentLiveTable.returnRowType);
        newAddRecordForm.setParentLiveTable(this.parentLiveTable);
        newAddRecordForm.setParentTableWindow(this);

        newAddRecordForm.buildForm();

        newAddRecordForm.open();

    }

    setTitle(title) {
        this.title = title;
        this.titleEl.innerHTML = title;
    }

    setSubjectID(id) {
        this.subjectID = id;
    }

    omitSummaryDrop() {
        this.summaryDrop.el.style.display = "none";
    }

    setBodyPixelHeight(height) {
        this.bodyEl.style.height = height;
    }

    turnDroppingOn() {
        this.titleEl.addEventListener("click", this.toggle);
    }

    turnDroppingOff() {
        this.titleEl.removeEventListener("click", this.toggle);
    }

    close() {
        this.bodyEl.style.display = "none";
    }

    open() {
        this.bodyEl.style.display = "flex";
        this.bodyEl.style.flex_direction = this.bodyFlexDirection;
    }

    toggle() {
        if (this.bodyEl.style.display === "none") {
            if (this.bodyEl.children[0].children != null) {
                if (this.bodyEl.children[0].children.length > 0) {
                    this.bodyEl.style.display = "flex";
                    this.bodyEl.style.flex_direction = this.bodyFlexDirection;
                }
            }
        } else {
            this.bodyEl.style.display = "none";
        }
    }

    addButtonToSummaryLine(input) {
        this.summaryLineButton = document.createElement("div");
        this.summaryLineButton.innerHTML = "BUTTON";
        this.titleRow.appendChild(this.summaryLineButton);
    }

    addRowAddingButton() {
        let newButton = new AddRecordToTableButton(this);
        newButton.setTitle("Add Record");
        newButton.setWidth("150px");
        this.titleRow.appendChild(newButton.el);
    }

    addPremadeButtonToSummaryLine(button) {
        this.titleRow.appendChild(button.el);
    }

    addRequestCriteria(criteriaObject) {
        this.columnArray.push(criteriaObject.columnString);
        this.functionArray.push(criteriaObject.functionTypeString);
        this.valueArray.push(criteriaObject.valueString);
    }

    setInclusions(inclusions) {
        this.inclusions = inclusions;
        //this.updateTableWindow(this.currentRows);
    }

    setFeatures(features) {
        for (let i = 0; i < features.length; i++) {
            this.features.push(features[i]);
        }

        if (this.features.includes("addRowButton")) {
            this.addRowAddingButton();
        }
        //this.updateTableWindow(this.currentRows);
    }

    allEqual(arr) {
        return arr.every((val) => val === arr[0]);
    }

    setReturnType(returnType) {
        this.returnType = returnType;
    }

    addAggregationToSummary(aggregationType, cardPointNames, prefaceText) {
        //let selectedCards = this.returnNonHiddenCardsForName(cardPointNames);
        let newAgg = eval(`new ${aggregationType}();`);

        newAgg.setParentTable(this);
        newAgg.setColumnName(cardPointNames);

        //for (let i = 0; i < selectedCards.length; i++) {
        //    newAgg.addLinkedCard(selectedCards[i]);
        //}

        newAgg.enableUpdates();

        newAgg.setPrefaceText(prefaceText);
        //this.summaryBodyEl.appendChild(newAgg.el);
        this.summaryDrop.collapsibleContainer.appendChild(newAgg.el);
        //this.summaryDrop.addRow(newAgg.el,false);
    }

    findDropCardForRow(row) {
        for (let i = 0; i < this.cardArray.length; i++) {
            if (row != null) {
                if (this.cardArray[i].parentObjectID == row.id.value) {
                    return this.cardArray[i];
                }
            }
        }
    }

    addEqualFilter(columnName, columnValue) {
        for (let i = 0; i < this.cardArray.length; i++) {
            let thisDropCard = this.cardArray[i];
            if (thisDropCard.subjectRow[columnName].value != columnValue) {
                thisDropCard.hide();
            }
        }
    }

    filteredCount() {
        let count = 0;
        for (let i = 0; i < this.cardArray.length; i++) {
            if (this.cardArray[i].hidden == false) {
                count++;
            }
        }
        return count;
    }

    returnArrayNotHidden() {
        let notHidden = [];
        for (let i = 0; i < this.cardArray.length; i++) {
            let thisDropCard = this.cardArry[i];
            if (thisDropCard.hidden == false) {
                notHidden.push(thisDropCard.subjectRow);
            }
        }
        return notHidden;
    }

    returnNonHiddenCardsForName(name) {
        let notHidden = this.returnArrayNotHidden();
        let cardArray = [];
        for (let i = 0; i < notHidden.length; i++) {
            cardArray.push(notHidden[i][name]);
        }
        return cardArray;
    }

    setTableBodyFlexDirection(direction) {
        this.bodyEl.style.display = "flex";
        this.bodyEl.style.flex_direction = direction;
        this.bodyFlexDirection = direction;
    }

    setStaticContainerFlexDirection(direction) {
        for (let i = 0; i < this.cardArray.length; i++) {
            this.cardArray[i].setStaticContainerFlexDirection(direction);
        }
    }

    setCollapsibleContainerFlexDirection(direction) {
        for (let i = 0; i < this.cardArray.length; i++) {
            this.cardArray[i].setCollapsibleContainerFlexDirection(direction);
        }
    }

    setOverallFlexDirection(direction) {
        for (let i = 0; i < this.cardArray.length; i++) {
            this.cardArray[i].setOverallFlexDirection(direction);
        }
    }
}



class SingleSelectTableRow extends TableWindowFromLiveTable {
    constructor() {
        super();
        this.allBool = false;
        this.selectedItems = [];
        this.selectedCard = null;
        //this.liveFunctionalityActive = false;
        this.setFeatures(["clickListener", "disconnectFromLiveTable"]);
    }

    /*addListeners() {
        for (let i = 0; i < this.cardArray.length; i++) {
            this.cardArray[i].subscribeToClick((selectedCard) => this.claimSelectedCard(selectedCard));
        }
    }
    */

    claimSelectedCard(selectedCard) {

        for (let i = 0; i < this.cardArray.length; i++) {
            this.cardArray[i].el.style.backgroundColor = "white";
        }
        this.selectedCard = selectedCard;
        this.selectedCard.el.style.backgroundColor = "yellow";

    }



    /*selectActiveViewByButton(selectedButton) {
        if (this.selectedItems.includes(selectedButton.title)) {
            this.selectedItems.pop(selectedButton.title);
            selectedButton.el.className = "InactiveTableWindowSelectorButton";
        } else {
            this.selectedItems.push(selectedButton.title);
            selectedButton.el.className = "ActiveTableWindowSelectorButton";
        }
    }
    */
}




class UserPrivilegeTable {
    constructor() {
        this.rowObjectType = "UserPrivilege";
        this.tableKeyCode = "ZyxvNtZdg3RrY9sGu";
        this.inclusions;

        this.confirmMatchWithWeldJointTable =
            this.confirmMatchWithWeldJointTable.bind(this);
        this.confirmMatchWithWeldJointTableActual =
            this.confirmMatchWithWeldJointTableActual.bind(this);
    }

    confirmMatchWithWeldJointTable(weldJointTable) {
        this.currentComparedWeldJointTable = weldJointTable;
        this.checkForBothReadyInterval = setInterval(
            this.confirmMatchWithWeldJointTableActual,
            200
        );
    }

    confirmMatchWithWeldJointTableActual() {
        if (this.queryFinishedFlag == true) {
            if (this.currentComparedWeldJointTable.queryFinishedFlag == true) {
                let filteredJointTable =
                    this.currentComparedWeldJointTable.returnArrayNotHidden();
                let filteredPrivileges = this.returnArrayNotHidden();
                let unqualedJointFound = false;
                for (let i = 0; i < filteredJointTable.length; i++) {
                    let joint = filteredJointTable[i];
                    let jointProcedureList = joint.subjectRowList.rowList;
                    let qualedForJoint = false;
                    for (let j = 0; j < jointProcedureList.length; j++) {
                        let procedure = jointProcedureList[j];
                        for (let k = 0; k < filteredPrivileges.length; k++) {
                            let privilege = filteredPrivileges[k];
                            //let matchCheck = privilege.matchesProcedure(procedure);
                            if (privilege.matchesProcedure(procedure)) {
                                qualedForJoint = true;
                                j = jointProcedureList.length;
                                k = this.requestReturnArray.length;
                            }
                        }
                    }
                    if (qualedForJoint == false) {
                        unqualedJointFound = true;

                        i = filteredJointTable.length;
                    }
                }

                if (unqualedJointFound == false) {
                    let notHidden = this.returnArrayNotHidden();
                    clearInterval(this.checkForBothReadyInterval);
                    //return true;
                } else {
                    this.el.style.display = "none";
                    this.associatedButton.el.style.display = "none";
                    clearInterval(this.checkForBothReadyInterval);
                    //return true;
                }
            } else {
            }
        } else {
        }
    }
}

class MultiViewSelectorSelectorButton {
    constructor(text, view, parentContainer) {
        this.el = document.createElement("div");
        this.el.className = "InactiveTableWindowSelectorButton";

        //this.parentView = view;
        this.title = text;

        this.titleEl = document.createElement("div");
        this.titleEl.innerHTML = text;
        this.titleEl.className = "selectorButtonTitle";

        this.el.appendChild(this.titleEl);

        this.filterCountRow = document.createElement("div");
        this.filterCountPrefaceEl = document.createElement("div");
        this.filterCountPrefaceEl.innerHTML = "Filtered Count: ";

        this.filterCountEl = document.createElement("div");

        this.filterCountRow.style.display = "flex";
        this.filterCountRow.style.flex_direction = "row";

        this.filterCountRow.appendChild(this.filterCountPrefaceEl);
        this.filterCountRow.appendChild(this.filterCountEl);

        //this.el.appendChild(this.filterCountRow);

        this.view = view;
        this.view.associatedButton = this;
        this.parentContainer = parentContainer;

        this.claimActiveView = this.claimActiveView.bind(this);

        this.showFilterCountElement = this.showFilterCountElement.bind(this);
        this.hideFilterCountElement = this.hideFilterCountElement.bind(this);
        this.setFilterCount = this.setFilterCount.bind(this);
        this.setParentView = this.setParentView.bind(this);

        this.el.addEventListener("click", this.claimActiveView);
    }

    claimActiveView() {
        this.parentContainer.selectActiveViewByButton(this);
    }

    setParentView(parentView) {
        this.parentView = parentView;
    }

    showFilterCountElement() {
        this.filterCountRow.style.display = "flex";
    }

    hideFilterCountElement() {
        this.filterCountRow.style.display = "none";
    }
    setFilterCount(count) {
        this.filterCountEl.innerHTML = count;
    }
}

class ViewWindow {
    constructor() {
        this.el = document.createElement("div");
        this.el.className = "ViewWindow";

        this.headerEl = document.createElement("div");
        //this.headerEl.className = "ViewWindowHeader";
        this.el.appendChild(this.headerEl);

        this.titleEl = document.createElement("div");
        this.titleEl.className = "ViewWindowTitle";
        this.headerEl.appendChild(this.titleEl);
        this.headerEl.style.display = "flex";
        this.headerEl.style.flexDirection = "row";

        this.precontentBucket = document.createElement("div");
        this.precontentBucket.className = "ViewWindowPrecontentBucket";

        this.contentBucket = document.createElement("div");
        this.contentBucket.className = "ViewWindowContentBucket";

        this.setTitle = this.setTitle.bind(this);
        this.boltToTopLevel = this.boltToTopLevel.bind(this);

        this.turnDroppingOn = this.turnDroppingOn.bind(this);
        this.turnDroppingOff = this.turnDroppingOff.bind(this);
        this.toggle = this.toggle.bind(this);

        this.bodyEl = document.createElement("div");
        this.bodyEl.className += "ViewWindowBody";

        this.bodyEl.appendChild(this.precontentBucket);
        this.bodyEl.appendChild(this.contentBucket);

        //this.bodyEl.style.overflow = "scroll";

        //this.el.appendChild(this.titleEl);
        //this.el.appendChild(this.summaryEl);
        //this.summaryDrop.el.appendChild(this.headerEl);
        //this.summaryDrop.staticContainer.appendChild(this.headerEl);
        //this.summaryDrop.collapsibleContainer.appendChild(this.bodyEl);
        this.el.appendChild(this.headerEl);
        this.el.appendChild(this.bodyEl);

        this.onRefreshFunctions = [];
    }

    turnDroppingOn() {
        this.headerEl.addEventListener("click", this.toggle);
    }

    turnDroppingOff() {
        this.headerEl.removeEventListener("click", this.toggle);
    }

    toggle() {
        if (this.bodyEl.style.display === "none") {
            if (this.bodyEl.children[0].children != null) {
                if (this.bodyEl.children[0].children.length > 0) {
                    this.bodyEl.style.display = "flex";
                    this.bodyEl.style.flex_direction = this.bodyFlexDirection;
                }
            }
        } else {
            this.bodyEl.style.display = "none";
        }
    }

    setTitle(title) {
        this.title = title;
        this.titleEl.innerHTML = title;
    }

    boltToTopLevel() {
        mainBox.appendChild(this.el);
    }

    addRefreshFunction(functionName, functionParamArray) {
        let newFunction = {
            functionName: functionName,
            functionParamArray: functionParamArray,
        };
        this.onRefreshFunctions.push(newFunction);
    }
}

class CustomPage {
    constructor() {
        this.addView = this.addView.bind(this);
        this.setStackVertical = this.setStackVertical.bind(this);
        this.setStackHorizontal = this.setStackHorizontal.bind(this);
        this.rebuildSizes = this.rebuildSizes.bind(this);
        this.views = [];


        this.el = document.createElement("div");
        this.el.style.height = "100vh";
        this.el.style.width = "100vw";

        this.el.style.position = "absolute";
        this.el.style.left = "0px";
        this.el.style.top = "0px";
        this.el.style.overflow = "hidden";
        //this.el.style.opacity: 0.9;
        //this.el.style.backgroundColor = "white";
        this.titleBar = document.createElement("div");
        this.titleEl = document.createElement("div");
        this.titleBar.appendChild(this.titleEl);
        this.el.appendChild(this.titleBar);

        this.setStackVertical();


        this.bcAgg = new RecordOfID(
            allColors,
            "DarkGrey"
        );
        this.bcAgg.subscribe((value) => this.updateBackground(value));
    }


    updateBackground(color) {
        if (color != null) {
            if (color.constructor.name == "Color") {
                let rgbaString = "rgba("
                rgbaString = rgbaString.concat(color.r.value);
                rgbaString = rgbaString.concat(",");
                rgbaString = rgbaString.concat(color.g.value);
                rgbaString = rgbaString.concat(",");
                rgbaString = rgbaString.concat(color.b.value);
                rgbaString = rgbaString.concat(",");
                rgbaString = rgbaString.concat(color.a.value);
                rgbaString = rgbaString.concat(")");
                this.el.style.backgroundColor = rgbaString;
            }
        }

    }


    addView(view, sizeWeight) {
        view.el.style.overflow = "scroll";
        view.el.style.backgroundColor = "rgba(220,220,220,.4)";
        //view.el.style.opacity = "50%";
        let newViewObject = { view: view, sizeWeight: sizeWeight };
        this.views.push(newViewObject);
        this.el.appendChild(view.el);
        let breakDiv = document.createElement("div");
        breakDiv.style.height = "3vh";
        this.el.appendChild(breakDiv);
        this.rebuildSizes();
    }

    setTitle(title) {
        this.titleEl.innerHTML = title;
    }

    setStackVertical() {
        this.el.style.display = "flex";
        this.el.style.flexDirection = "column";

        this.stackDirection = "vertical";
    }

    setStackHorizontal() {
        this.el.style.display = "flex";
        this.el.style.flexDirection = "row";

        this.stackDirection = "horizontal";
    }

    rebuildSizes() {
        let totalWeight = 0;
        for (let i = 0; i < this.views.length; i++) {
            totalWeight += this.views[i].sizeWeight;
        }

        if (this.stackDirection == "vertical") {
            for (let i = 0; i < this.views.length; i++) {
                let setString = (this.views[i].sizeWeight / totalWeight) * 100 + "vh";
                this.views[i].view.el.style.height = setString;
                this.views[i].view.el.style.width = "100vw";
            }
        }
    }
}

class Popup extends CustomPage {
    constructor() {
        super();

        this.mainView = new ViewWindow();

        this.submitButton = document.createElement("div");
        this.submitButton.className = "isoButton";
        this.submitButton.innerHTML = "Submit Changes";
        this.mainView.headerEl.appendChild(this.submitButton);

        this.exitButton = document.createElement("div");
        this.exitButton.className = "isoButton";
        this.exitButton.innerHTML = "Return To Previous";
        this.mainView.headerEl.appendChild(this.exitButton);

        this.open = this.open.bind(this);
        this.close = this.close.bind(this);
        this.setSubjectRow = this.setSubjectRow.bind(this);
        this.setSubjectTable = this.setSubjectTable.bind(this);

        this.submitButton.addEventListener("click", (event) => {
            this.subChanges();
            // You can trigger custom events or update other UI elements here
        });

        //this.submitButton.addEventListener("click", this.subChanges);
        //this.submitButton.addEventListener("click", this.printit);

        this.exitButton.addEventListener("click", this.close);

        this.addView(this.mainView, 1);

        this.zValue = 0;
        this.el.style.zIndex = this.zValue;

        mainBox.appendChild(this.el);
    }

    open() {
        this.zValue = Math.max(...popupZArray) + 50;
        popupZArray.push(this.zValue);
        this.el.style.display = "flex";
        this.el.style.zIndex = this.zValue;
    }

    close() {
        this.el.style.zIndex = 0;
        this.el.parentElement.removeChild(this.el);
        for (let i = 0; i < popupZArray.length; i++) {
            if (popupZArray[i] == this.zValue) {
                popupZArray.splice(i, 1);
            }
        }
        this.el.style.display = "none";
    }

    setSubjectRow(subjectRow) {
        this.subjectRow = subjectRow;
    }
    setSubjectTable(subjectTable) {
        this.subjectTable = subjectTable;
    }
}



class NewRecordForm extends Popup {
    constructor() {
        super();
        this.setParentLiveTable = this.setParentLiveTable.bind(this);
        this.setParentTableWindow = this.setParentTableWindow.bind(this);
        this.setRecordType = this.setRecordType.bind(this);
        this.setInclusions = this.setInclusions.bind(this);
        this.buildForm = this.buildForm.bind(this);
        this.subChanges = this.subChanges.bind(this);
        this.send = this.send.bind(this);

        this.inputFieldEl = document.createElement("div");
        this.mainView.contentBucket.appendChild(this.inputFieldEl);

        this.inputFields = [];
    }

    setParentRecord(parentRecord) {
        this.parentRecord = parentRecord;
    }

    setParentLiveTable(parentLiveTable) {
        this.parentLiveTable = parentLiveTable;
    }

    setParentTableWindow(parentTableWindow) {
        this.parentTableWindow = parentTableWindow;
    }

    setRecordType(recordType) {
        this.recordType = recordType;
        this.titleString = "New ";
        this.titleString = this.titleString.concat(this.recordType);
        this.setTitle(this.titleString);
    }

    setInclusions() {
        if (this.record) { }
        else { this.record = eval(`new ${this.recordType}();`); }
        this.inclusions = this.record.newFormInclusions;
    }

    buildForm() {
        this.setInclusions();
        if (this.record) {
            let recordExistsBool = true;
        }
        else {
            this.record = eval(`new ${this.recordType}();`);
        }

        for (let i = 0; i < this.inclusions.length; i++) {
            let thisInclusion = this.inclusions[i];

            if (thisInclusion.column == this.parentTableWindow.postFilters[0].columnName) {
                let newInputField = new AutofilledField();
                newInputField.setLabel(thisInclusion.displayName);
                newInputField.setValue(this.parentTableWindow.postFilters[0].columnValue);
                this.inputFieldEl.appendChild(newInputField.el);
                thisInclusion.inputObject = newInputField;


            }



            else if (thisInclusion.inputType == "CurrentTime") {

            }
            else if (thisInclusion.inputType == "LoggedInUser") {

            }

            else if (thisInclusion.inputType == "ParentRecordID") {
                let newInputField = new AutofilledField();
                newInputField.setLabel(thisInclusion.displayName);
                newInputField.setValue(this.parentRecord.id.value);
                this.inputFieldEl.appendChild(newInputField.el);
                thisInclusion.inputObject = newInputField;
            }

            else if (thisInclusion.inputType == "KeepSame") {
                let newInputField = new AutofilledField();
                newInputField.setLabel(thisInclusion.displayName);
                newInputField.setValue(this.record[thisInclusion.column].value);
                this.inputFieldEl.appendChild(newInputField.el);
                thisInclusion.inputObject = newInputField;
            }


            else if (thisInclusion.inputType == "Autofill") {
                let newInputField = new AutofilledField();
                newInputField.setLabel(thisInclusion.displayName);
                newInputField.setValue(thisInclusion.autofillAnswer);
                this.inputFieldEl.appendChild(newInputField.el);
                thisInclusion.inputObject = newInputField;
            }

            else {
                let newInputField = eval(`new ${thisInclusion.inputType}();`);
                newInputField.setLabel(thisInclusion.displayName);
                newInputField.setParentRecordCellName(thisInclusion.column);
                this.inputFieldEl.appendChild(newInputField.el);
                thisInclusion.inputObject = newInputField;
            }


        }

    }

    subChanges() {
        let newID = "";

        this.recordJSON = {};

        for (let i = 0; i < this.inclusions.length; i++) {
            let thisInclusion = this.inclusions[i];
            let columnKey = this.record[thisInclusion.column].columnKeyCode;
            if (thisInclusion.inputType == "CurrentTime") { this.recordJSON[columnKey] = new Date(); }
            else if (thisInclusion.inputType == "LoggedInUser") { this.recordJSON[columnKey] = liu.id; }
            else { this.recordJSON[columnKey] = thisInclusion.inputObject.getValue(); }

            if (thisInclusion.includeInID) {
                if (thisInclusion.includeInID == true) {
                    newID = newID.concat("_");
                    newID = newID.concat(this.recordJSON[columnKey]);
                }
            }
        }

        this.recordJSON["id"] = newID;



        //this.parentWindow.allAssignments.addRecord({ id: newID, oiqoc_task_id: this.subjectRow.id, })

        this.send();
        this.close();
    }

    send() {
        this.parentTableWindow.parentLiveTable.addRecord(this.recordJSON, this.record);
        this.record.addVars(this.recordJSON);

    }
}

class EditRecordForm extends NewRecordForm {
    constructor(record) {
        super();
        this.subChanges = this.subChanges.bind(this);
        this.setInclusions = this.setInclusions.bind(this);
        this.send = this.send.bind(this);
        this.record = record;

    }

    setInclusions() {
        this.inclusions = this.record.editFormInclusions;
    }

    send() { this.record.updateVars(this.recordJSON); }
}



class SingleMultiplcityRecordGenForm extends NewRecordForm {
    constructor() {
        super();
        this.setInclusions = this.setInclusions.bind(this);
        this.subChanges = this.subChanges.bind(this);
    }

    setInclusions() {
        let testRecord = eval(`new ${this.recordType}();`);
        this.inclusions = testRecord.newFormInclusions;
    }

    subChanges() {

        for (let i = 0; i < this.inclusions.length; i++) {
            if (this.inclusions[i].multiplicity == true) {
                let arrayAtMultiplicity = this.inclusions[i].inputObject.getValue();
                for (let j = 0; j < arrayAtMultiplicity.length; j++) {
                    var record = eval(`new ${this.recordType}();`);


                    var newID = "";

                    var recordJSON = {};

                    recordJSON[record[this.inclusions[i].column].columnKeyCode] = arrayAtMultiplicity[j];

                    if (this.inclusions[i].includeInID) {
                        if (this.inclusions[i].includeInID == true) {
                            newID = newID.concat(arrayAtMultiplicity[j]);
                        }
                    }


                    for (let k = 0; k < this.inclusions.length; k++) {
                        if (k != i) {
                            var inclusion = this.inclusions[k];
                            var columnKey = record[inclusion.column].columnKeyCode;

                            if (inclusion.inputType == "CurrentTime") {
                                let currentDatetime = new Date()
                                recordJSON[columnKey] = currentDatetime;
                                if (inclusion.includeInID == true) {
                                    newID = newID.concat("_");
                                    newID = newID.concat(currentDatetime.toISOString());
                                }
                            }
                            else if (inclusion.inputType == "LoggedInUser") {
                                recordJSON[columnKey] = liu.id;
                                if (inclusion.includeInID == true) {
                                    newID = newID.concat("_");
                                    newID = newID.concat(liu.id);
                                };
                            }

                            else if (inclusion.inputType == "Autofill") {
                                recordJSON[columnKey] = inclusion.autofillAnswer;
                                if (inclusion.includeInID == true) {
                                    newID = newID.concat("_");
                                    newID = newID.concat(inclusion.autofillAnswer);
                                };
                            }

                            else {
                                recordJSON[columnKey] = inclusion.inputObject.getValue();
                                if (inclusion.includeInID == true) {
                                    newID = newID.concat("_");
                                    newID = newID.concat(recordJSON[columnKey]);
                                };

                            }

                        }
                    }

                    recordJSON["id"] = newID;


                    record.addVars(recordJSON);

                    this.parentLiveTable.addRecord(recordJSON, record);
                }

            }
        }




        this.close();
    }
}




class InputField {
    constructor(value) {
        this.getValue = this.getValue.bind(this);
        this.setValue = this.setValue.bind(this);
        this.setLabel = this.setLabel.bind(this);
        this.disableValueDisplayBox = this.disableValueDisplayBox.bind(this);

        this.value = value;

        this.el = document.createElement("div");
        this.el.style.display = "flex";
        this.el.style.flex_direction = "row";
        this.labelEl = document.createElement("div");
        this.el.appendChild(this.labelEl);

        this.inputEl = document.createElement("input");
        this.el.appendChild(this.inputEl);

        this.customInputEl = document.createElement("div");
        this.el.appendChild(this.customInputEl);

        this.valueDisplayBoxEl = document.createElement("div");
        this.valueEl = document.createElement("div");
        this.valueDisplayBoxEl.appendChild(this.valueEl);

        this.el.appendChild(this.valueDisplayBoxEl);
    }

    disableValueDisplayBox() {
        this.valueDisplayBoxEl.style.display = "none";
    }

    getValue() {
        return this.inputEl.value;
    }

    setValue(newValue) {
        this.value = newValue;
        this.inputEl.value = newValue;
        this.valueEl.innerHTML = this.value;
    }

    setLabel(newLabel) {
        this.labelEl.innerHTML = newLabel;
    }

    setParentRecordCellName(parentRecordCellName) {
        this.parentRecordCellName = parentRecordCellName;
    }
}

class AutofilledField {
    constructor(value) {
        this.el = document.createElement("div");
        this.el.style.display = "flex";
        this.el.style.flex_direction = "row";
        this.labelEl = document.createElement("div");
        this.el.appendChild(this.labelEl);

        this.inputEl = document.createElement("div");
        this.inputEl.innerHTML = value;
        this.el.appendChild(this.inputEl);

        this.value = value
    }

    setLabel(newLabel) {
        this.labelEl.innerHTML = newLabel;
    }

    setValue(newValue) {
        this.inputEl.innerHTML = newValue;
        this.value = newValue;
    }

    getValue() {
        return this.value;
    }

}

class TextInput extends InputField {
    constructor() {
        super();
        this.disableValueDisplayBox();

        this.inputEl.type = "text";
        this.inputEl.placeholder = "Enter text here";
    }
}

class TableDrivenMultiSelect extends InputField {
    constructor() {
        super();
        this.multiSelectTabTable = new MultiSelectFromTabFiltered("Label", allUsers, "id", allUserPrivileges, "privilegedUser");
        this.customInputEl.appendChild(this.multiSelectTabTable.el);
        this.multiSelectTabTable.el.style.height = "60vh";
        this.multiSelectTabTable.el.style.overflow = "scroll";

        this.inputEl.style.display = "none";

        this.multiSelectTabTable.setInclusions([
            { columnString: "qualType", staticBool: true, displayName: "Qualification Type" },
            //{ columnString: "assignedOperator", staticBool: true, displayName: "Assigned Operator" },
        ]);
    }

    getValue() {
        return this.multiSelectTabTable.selectedItems;
    }
}


class TableDrivenRecordSelect extends InputField {
    constructor() {
        super();
        this.singleRowSelect = new SingleSelectTableRow();
        this.singleRowSelect.el.style.height = "60vh";
        this.singleRowSelect.el.style.overflow = "scroll";

        this.singleRowSelect.addPostRequestFilter(
            "numberOfAssignments",
            0,
            "EQUAL"
        );

        this.singleRowSelect.setInclusions([
            { columnString: "desc", staticBool: true, displayName: "Description" },
            {
                columnString: "masterTraveler",
                staticBool: true,
                displayName: "Master Traveler",
            },
            { columnString: "opCode", staticBool: true, displayName: "Op Code" },
            {
                columnString: "tsn",
                staticBool: true,
                displayName: "Traveler Serial Number",
            },
            { columnString: "priority", staticBool: true, displayName: "Priority" },
            {
                columnString: "numberOfAssignments",
                staticBool: true,
                displayName: "Number Of Assignments",
            },
        ]);
        this.singleRowSelect.setParentLiveTable(allTasks);
        this.singleRowSelect.setTitle("Unassigned Tasks");




        this.customInputEl.appendChild(this.singleRowSelect.el);

        this.inputEl.style.display = "none";

    }

    getValue() {
        return this.singleRowSelect.selectedCard.targetRow.id.value;
    }
}


class LiveInput extends InputField {
    constructor(value) {
        super();
        this.addListener = this.addListener.bind(this);
        this.addListener();
    }

    addListener() {
        this.inputEl.addEventListener("input", (event) => {
            this.value = event.target.value;
            this.valueEl.innerHTML = this.value;
        });
    }
}

class RangeSlider extends LiveInput {
    constructor(min, max, value, step) {
        super(value);

        this.min = min;
        this.max = max;
        this.value = value;
        this.step = step;

        this.inputEl.type = "range";

        this.inputEl.min = this.min;
        this.inputEl.max = this.max;
        this.inputEl.value = this.value;
        this.valueEl.innerHTML = this.value;
        this.inputEl.step = this.step;

        this.addListener();
    }
}

class DatePicker extends LiveInput {
    constructor() {
        super(null);

        this.min = new Date();
        this.max = this.min.getDate() + 60;
        this.value = null;

        this.inputEl.type = "date";
        this.inputEl.className = "CalendarInput";

        this.inputEl.min = this.min;
        this.inputEl.max = this.max;
        this.inputEl.value = this.value;
        this.valueEl.innerHTML = this.value;
        this.addListener();
    }

    getValue() {
        let newDate = new Date(this.inputEl.value.concat("T11:51:00"));
        return newDate;
    }

    /*addListener() {
        this.inputEl.addEventListener("input", (event) => {
            this.value = event.target.value;
            this.value = new Date(this.value);
            this.valueEl.innerHTML = this.value;
        });
    }
    */
}

class MultiViewWindow extends ViewWindow {
    constructor(name) {
        super();
        this.el.className = "MultiViewWindow";

        this.setTitle(name);
        this.selectorRow = document.createElement("div");
        this.selectorRow.className += "MultiTableWindowSelectorRow";
        this.selectorRow.style.display = "flex";
        this.selectorRow.style.flex_direction = "row";
        this.selectorRow.style.overflowX = "scroll";
        this.precontentBucket.appendChild(this.selectorRow);

        this.viewButtonArray = [];
        this.addView = this.addView.bind(this);
        this.selectActiveViewByButton = this.selectActiveViewByButton.bind(this);
        this.selectActiveView = this.selectActiveView.bind(this);
        //this.el.appendChild(this.selectorRow);
    }

    clearViews() {
        while (this.selectorRow.firstChild) {
            this.selectorRow.removeChild(this.selectorRow.firstChild);
        }
    }

    addView(view, viewButtonString) {
        if (viewButtonString == null) {
            viewButtonString = "None";
        }
        let newButton = new MultiViewSelectorSelectorButton(
            viewButtonString,
            view,
            this
        );
        this.viewButtonArray.push(newButton);
        this.selectorRow.appendChild(newButton.el);
        newButton.showFilterCountElement();
        //newButton.el.addEventListener("click", this.selectActiveView(table.el));
    }

    selectActiveViewByButton(selectedButton) {
        for (let button = 0; button < this.viewButtonArray.length; button++) {
            this.viewButtonArray[button].el.className =
                "InactiveTableWindowSelectorButton";
        }

        if (this.contentBucket.children.length != 0) {
            this.contentBucket.removeChild(this.contentBucket.children[0]);
        }

        this.contentBucket.appendChild(selectedButton.view.el);
        selectedButton.el.className = "ActiveTableWindowSelectorButton";
        selectedButton.setFilterCount(selectedButton.view.filteredCount());
    }

    selectActiveView(selectedWindow) {
        this.contentBucket.appendChild(selectedWindow.el);

        //selectedWindow.el.className = "ActiveTableWindowSelectorButton";
    }
}

class ButtonFunction {
    constructor(parentButton) {
        this.parentButton = parentButton;
    }

    setObjectThatOwnsMethod(objectThatOwnsMethod) {
        this.objectThatOwnsMethod = objectThatOwnsMethod;
    }

    setMethodString(methodString) {
        methodString;
    }
}

class Button {
    constructor() {
        this.el = document.createElement("div");
        this.el.className += "Button";
        this.functionList = [];
        this.setTitle = this.setTitle.bind(this);
        this.setHeight = this.setHeight.bind(this);
        this.setWidth = this.setWidth.bind(this);
        this.setLRMArgin = this.setLRMArgin.bind(this);
        this.setUDMArgin = this.setUDMArgin.bind(this);

        this.addFunctionWithParamViaLocation =
            this.addFunctionWithParamViaLocation.bind(this);
        this.run = this.run.bind(this);

        this.el.addEventListener("click", this.run);
        this.titleEl = document.createElement("div");
        this.el.appendChild(this.titleEl);

        this.el.style.display = "flex";
        this.el.style.justifyContent = "center";
        this.el.style.alignItems = "center";

        this.el.style.border = "2px";
        this.el.style.borderRadius = "4px";
        this.el.style.borderStyle = "solid";
        this.el.style.margin = "15px";

        this.titleString = null;
    }

    setTitle(text) {
        this.titleString = text;
        this.titleEl.innerHTML = text;
    }

    setHeight(heightString) {
        this.el.style.height = heightString;
    }

    setWidth(widthString) {
        this.el.style.width = widthString;
    }

    setLRMArgin(text) {
        this.el.style.marginLeft = text;
        this.el.style.marginRight = text;
    }

    setUDMArgin(text) {
        this.el.style.marginUp = text;
        this.el.style.marginDown = text;
    }

    addFunctionWithParamViaLocation(
        functionParentObject,
        functionString,
        functionParamLocationObject,
        functionParamLocationString
    ) {
        let newFunctionObject = {
            functionParentObject: functionParentObject,
            functionString: functionString,
            functionParamLocationObject: functionParamLocationObject,
            functionParamLocationString: functionParamLocationString,
        };
        this.functionList.push(newFunctionObject);
    }

    run() {
        for (let i = 0; i < this.functionList.length; i++) {
            if (this.functionList[i].functionParamLocationObject == "self") {
                this.functionList[i].functionParamLocationObject = this;
            }

            if (this.functionList[i].functionParamLocationObject != null) {
                if (this.functionList[i].functionParamLocationString != null) {
                    //    this.functionList[i].functionParamLocationString
                    //]);

                    this.functionList[i].functionParentObject[
                        this.functionList[i].functionString
                    ](
                        this.functionList[i].functionParamLocationObject[
                        this.functionList[i].functionParamLocationString
                        ]
                    );
                }
            } else {
                this.functionList[i].functionParentObject[
                    this.functionList[i].functionString
                ]();
            }
        }
    }

    removeEventListeners() {
        this.el.removeEventListener("click", this.run);
    }
}

class DeleteRowButton extends Button {
    constructor(subjectRow) {
        super();
        this.subjectRow = subjectRow;
        this.addFunctionWithParamViaLocation(
            this.subjectRow,
            "deleteRecord",
            null,
            null
        );

        this.el.style.backgroundColor = "red";
        this.setTitle("Delete");
        this.setHeight("35px");
        this.setWidth("100px");

        this.setUDMArgin("15px");
    }
}

class EditRowButton extends Button {
    constructor(parentCard) {
        super();
        this.parentCard = parentCard;
        //this.subjectRow = this.parentCard.targetRow;
        this.addFunctionWithParamViaLocation(
            this.parentCard,
            "generateEditForm",
            null,
            null
        );

        this.el.style.backgroundColor = "yellow";
        this.setTitle("Edit Record");
        this.setHeight("35px");
        this.setWidth("150px");

        this.setUDMArgin("15px");
    }
}

class AddRecordToTableButton extends Button {
    constructor(tableWindow) {
        super();
        this.tableWindow = tableWindow;
        this.addFunctionWithParamViaLocation(
            this.tableWindow,
            "openAddRecordForm",
            null,
            null
        );

        this.el.style.backgroundColor = "yellow";
        this.setTitle("Add Record");
        this.setHeight("35px");
        this.setWidth("100px");

        this.setUDMArgin("15px");
    }
}


class PopupButton extends Button {
    constructor(popupObject, popupSubject) {
        super();
        this.popupObject = popupObject;
        this.popupSubject = popupSubject;
        //this.addFunctionWithParamViaLocation(
        //    this.popupObject,
        //    "boltToTopLevel",
        //    null,
        //    null
        //);
        //this.addFunctionWithParamViaLocation(
        //    this.popupObject,
        //    "takeMainWindow",
        //    null,
        //    null
        //);
        this.addFunctionWithParamViaLocation(
            this.popupObject,
            "setSubject",
            this,
            "popupSubject"
        );
        this.addFunctionWithParamViaLocation(
            this.popupObject,
            "loadCardDatapoints",
            null,
            null
        );

        this.addFunctionWithParamViaLocation(this.popupObject, "open", null, null);

        //let manageTaskWindow = new TaskScheduleManager();
        //manageTaskWindow.setTitle("Manage Task");
    }

    openTargetDetailPage() {
        let detailPage = eval(`new ${this.detailPageType}();`);
        detailPage.setSubjectRow(this.targetRow);
        //detailPage.setReturnLocation(this);
        detailPage.loadCardDatapoints();
    }
}

class NewPopupButton extends Button {
    constructor(popupTypeString, popupSubjectRow, popupSubjectTable) {
        super();
        this.popupTypeString = popupTypeString;
        this.popupSubjectRow = popupSubjectRow;
        this.popupSubjectTable = popupSubjectTable;

        this.openPopup = this.openPopup.bind(this);

        this.addFunctionWithParamViaLocation(this, "openPopup", null, null);
    }

    openPopup() {
        let popup = eval(`new ${this.popupTypeString}();`);
        popup.setSubjectRow(this.popupSubjectRow);
        if (this.popupSubjectTable != null) {
            popup.setSubjectTable(this.popupSubjectTable);
        }

        popup.loadCardDatapoints();
    }
}

class ButtonToPremadePopup extends Button {
    constructor(popup) {
        super();
        this.popup = popup;

        this.openPopup = this.openPopup.bind(this);

        this.addFunctionWithParamViaLocation(this, "openPopup", null, null);
    }

    openPopup() {
        this.popup.open();
    }


}


class TableButton extends Button {
    constructor() {
        super();

        this.setParentTable = this.setParentTable.bind(this);
        this.returnClone = this.returnClone.bind(this);
    }
    setParentTable(parentTable) {
        this.parentTable = parentTable;
    }

    returnClone() {
        let clone = new TableButton();
        for (let i = 0; i < this.functionList.length; i++) {
            clone.addFunctionWithParamViaLocation(
                this.functionList[i].functionParentObject,
                this.functionList[i].functionString,
                this.functionList[i].functionParamLocationObject,
                this.functionList[i].functionParamLocationString
            );
            clone.setTitle(this.titleString);
        }

        return clone;
    }
}

class TabFilteredLiveTableWindow extends MultiViewWindow {
    constructor(superName, parentLiveTable, tabValues, columnName) {
        super(superName);
        this.columnName = columnName;
        this.tabValues = tabValues;
        this.parentLiveTable = parentLiveTable;

        //this.addRowDetailButtons = this.addRowDetailButtons.bind(this);
        //this.addRowDetailButtonsActual = this.addRowDetailButtonsActual.bind(this);

        //this.addPremadeButtonToAllTables =
        //    this.addPremadeButtonToAllTables.bind(this);
        //this.addPremadeButtonToAllTablesActual =
        //    this.addPremadeButtonToAllTablesActual.bind(this);

        this.setTableBodyFlexDirection = this.setTableBodyFlexDirection.bind(this);

        this.runFunctionForAllTables = this.runFunctionForAllTables.bind(this);
        this.runFunctionForAllTablesActual =
            this.runFunctionForAllTablesActual.bind(this);

        //this.runFunctionForAllTablesMultiParam =
        //    this.runFunctionForAllTablesMultiParam.bind(this);
        //this.runFunctionForAllTablesMultiParamActual =
        //    this.runFunctionForAllTablesMultiParamActual.bind(this);

        //this.turnDroppingOn = this.turnDroppingOn.bind(this);
        //this.turnDroppingOff = this.turnDroppingOff.bind(this);
        //this.toggle = this.toggle.bind(this);

        this.setCollapsibleContainerFlexDirection =
            this.setCollapsibleContainerFlexDirection.bind(this);
        this.setStaticContainerFlexDirection =
            this.setStaticContainerFlexDirection.bind(this);
        this.setOverallFlexDirection = this.setOverallFlexDirection.bind(this);

        this.addFilterParameter = this.addFilterParameter.bind(this);
        this.addFilterParameterActual = this.addFilterParameterActual.bind(this);

        this.build = this.build.bind(this);

        this.allTablesLoadedFlag = false;
        this.tablesLoadedCheckArray = [];
        this.tableArray = [];
        this.inclusions = [];
        this.features = [];

        this.allBool = true;
        this.el.style.display = "flex";
        this.el.style.flex_direction = "column";
    }

    setParentLiveTable(parentLiveTable) {
        this.parentLiveTable = parentLiveTable;
        //this.parentLiveTable.subscribe((arb) => this.build(arb));
    }

    setInclusions(inclusions) {
        this.inclusions = inclusions;
        //this.build();
    }

    setFeatures(features) {
        this.features = features;
        //this.build();
    }

    build() {
        //let uniqueValues = this.parentLiveTable.returnUniqueValuesForColumn(this.columnName);
        this.clearViews();
        if (this.allBool == true) {
            let newTable = new TableWindowFromLiveTable();
            newTable.setInclusions(this.inclusions);
            newTable.setFeatures(this.features);
            newTable.setParentLiveTable(this.parentLiveTable);
            this.addView(newTable, "All");
            this.tableArray.push(newTable);
        }
        for (let i = 0; i < this.tabValues.length; i++) {
            let newTableDisplay = new TableWindowFromLiveTable();
            newTableDisplay.setInclusions(this.inclusions);
            newTableDisplay.setFeatures(this.features);
            newTableDisplay.addPostRequestFilter(
                this.columnName,
                this.tabValues[i],
                "EQUAL"
            );
            newTableDisplay.setParentLiveTable(this.parentLiveTable);
            this.addView(newTableDisplay, this.tabValues[i]);
            this.tableArray.push(newTableDisplay);
        }
    }

    runFunctionForAllTables(functionString, functionParam) {
        this.runFunctionForAllTablesActual(functionString, functionParam);
    }

    runFunctionForAllTablesActual(functionString, functionParam) {
        for (let i = 0; i < this.tableArray.length; i++) {
            this.tableArray[i][functionString](functionParam);
        }
    }

    //addPremadeButtonToAllTables(premadeButton) {
    //    let waiter = new WhenFlagTrueCallFunction(
    //        this,
    //        "allTablesLoadedFlag",
    //        this,
    //        "addPremadeButtonToAllTablesActual",
    //        premadeButton
    //    );
    //}

    //addPremadeButtonToAllTablesActual(premadeButton) {
    //    for (let i = 0; i < this.tableArray.length; i++) {
    //        let newButton = premadeButton.returnClone();
    //        newButton.setParentTable(this.tableArray[i]);
    //        this.tableArray[i].addPremadeButtonToSummaryLine(newButton);
    //    }
    //}

    //runFunctionForAllTablesMultiParam(functionString, functionParams) {
    //    let waiter = new WhenFlagTrueCallFunctionMultiParams(
    //        this,
    //        "allTablesLoadedFlag",
    //        this,
    //        "runFunctionForAllTablesMultiParamActual",
    //        [functionString, functionParams]
    //    );
    //}

    //runFunctionForAllTablesMultiParamActual(functionString, functionParams) {
    //    for (let i = 0; i < this.tableArray.length; i++) {
    //        this.tableArray[i][functionString](...functionParams);
    //    }
    //}

    //addRowDetailButtons(buttonTitle) {
    //    let waiter = new WhenFlagTrueCallFunction(
    //        this,
    //        "allTablesLoadedFlag",
    //        this,
    //        "addRowDetailButtonsActual",
    //        buttonTitle
    //    );
    //}

    //addRowDetailButtonsActual(buttonTitle) {
    //    for (let i = 0; i < this.tableArray.length; i++) {
    //        this.tableArray[i].addRowDetailButtons(buttonTitle);
    //    }
    //}

    addFilterParameter(filterParameter) {
        let waiter = new WhenFlagTrueCallFunction(
            this,
            "allTablesLoadedFlag",
            this,
            "addFilterParameterActual",
            filterParameter
        );
    }

    addFilterParameterActual(parameterObject) {
        for (let i = 0; i < this.tableArray.length; i++) {
            this.tableArray[i].addEqualFilter(
                parameterObject.filterColumnName,
                parameterObject.filterColumnValue
            );
        }
    }

    filterTablesByTableFunction(functionString, functionParam) {
        for (let i = 0; i < this.tableArray.length; i++) {
            this.tableArray[i][functionString](functionParam);
        }
    }

    setStaticContainerFlexDirection(direction) {
        for (let i = 0; i < this.tableArray.length; i++) {
            this.tableArray[i].setStaticContainerFlexDirection(direction);
        }
    }

    setCollapsibleContainerFlexDirection(direction) {
        for (let i = 0; i < this.tableArray.length; i++) {
            this.tableArray[i].setCollapsibleContainerFlexDirection(direction);
        }
    }

    setOverallFlexDirection(direction) {
        for (let i = 0; i < this.tableArray.length; i++) {
            this.tableArray[i].setOverallFlexDirection(direction);
        }
    }

    setTableBodyFlexDirection(direction) {
        this.runFunctionForAllTables("setTableBodyFlexDirection", "column");
    }
}

class UniqueValueDrivenTabs extends TabFilteredLiveTableWindow {
    constructor(
        title,
        uniqueValueTable,
        uniqueValueColumn,
        drivingTable,
        drivingTableColumn
    ) {
        super(title, drivingTable, ["a", "b"], drivingTableColumn);
        this.titleString = title;

        let existingAgg = uniqueValueTable.checkForExistingAgg(
            uniqueValueColumn,
            "UniqueValues"
        );
        if (existingAgg == null) {
            this.uniqueValuesAggregate = new UniqueValues(
                uniqueValueTable,
                uniqueValueColumn
            );
            uniqueValueTable.aggregations.push(this.uniqueValuesAggregate);
        } else {
            this.uniqueValuesAggregate = existingAgg;
        }

        //this.uniqueValuesAggregate = new UniqueValues(uniqueValueTable, uniqueValueColumn);
        this.setInclusions = this.setInclusions.bind(this);
        this.updateUniqueValues = this.updateUniqueValues.bind(this);
        this.uniqueValuesAggregate.subscribe((values) =>
            this.updateUniqueValues(values)
        );
    }

    setInclusions(inclusions) {
        this.inclusions = inclusions;
        this.updateUniqueValues(this.tabValues);
    }

    setFeatures(features) {
        this.features = features;
        this.updateUniqueValues(this.tabValues);
    }

    updateUniqueValues(values) {
        this.tabValues = values;
        if (this.tabValues.length > 0) {
            if (this.inclusions.length > 0) {
                this.build();
            }
        }
    }
}


class MultiSelectFromTabFiltered extends UniqueValueDrivenTabs {
    constructor(title, uniqueValueTable, uniqueValueColumn, drivingTable, drivingTableColumn) {
        super(title, uniqueValueTable, uniqueValueColumn, drivingTable, drivingTableColumn);
        this.allBool = false;
        this.selectedItems = [];
    }

    selectActiveViewByButton(selectedButton) {
        if (this.selectedItems.includes(selectedButton.title)) {
            this.selectedItems.pop(selectedButton.title);
            selectedButton.el.className = "InactiveTableWindowSelectorButton";
        } else {
            this.selectedItems.push(selectedButton.title);
            selectedButton.el.className = "ActiveTableWindowSelectorButton";
        }
    }
}


