
/**
 * @description Create a new instance to communicate with Nornir Domain Service (NDS)
 *
 * @param {object} object The connection object used for authentication and log in
 * @param {string} object.username The user name associated with the service
 * @param {string} object.password The password for authentication of the user
 * @param {string} object.domain The given domain for the service
 * @param {string} object.path The path for the service
 * @param {string} object.service The service to connect to
 * @param {number} object.port The port to connect to defaults to 8080
 * @param {number} object.id The object id for the sensor to connect to, defaults to 1
 * @param {Array} object.expected The array of expected schema properties to listen to
 * @class Nornir
 * @author Nornir Technologies
 */
function Nornir(object) {

    function appendSlash(string) {
        if (!string.endsWith("/")) {
            string += "/";
        }
        return string;
    }

    var protocol = object.protocol || "http://";

    /**
     * @description The username from the parameter object
     * @var
     * @access private
     * @memberOf Nornir
     */
    var username = object.username || null;

    /**
     * @description The password from the parameter object
     * @var
     * @access private
     * @memberOf Nornir
     */
    var password = object.password || null;

    /**
     * @description The domain owned by the user of the service. Default cybernetdomain.synxbios.com/
     * @var
     * @access private
     * @memberOf Nornir
     */
    var server = object.server || "realtimeweb.synxbios.com";
    // var server = object.server || null;
    /**
     * @description The path to the domain Default /RTWServer/Receiver/
     * @var
     * @access private
     * @memberOf Nornir
     */
    var path = object.path || "/";
    // var path = "";
    // path = appendSlash(path);
    // path += (!path.startsWith("/")) ? "/" : "";
    /**
     * @description The service to connect to
     * @var
     * @access private
     * @memberOf Nornir
     */
    var service = object.service || "";
    // var service = "";

    /**
     * @description The domain to the service
     * @type {string|string}
     * @access private
     * @var
     * @memberOf Nornir
     */
    var domain = object.domain || "";
    // var domain = "";
    // domain = appendSlash(domain);
    /**
     * @description The port to connect with. Default is 8080
     * @var
     * @access private
     * @memberOf Nornir
     */
    var port = object.port || 8080;


    var url = object.url || "";
    /**
     * @description The expected services object. This is initiated as an object so the listeners can be connected to the object
     * @var
     * @access private
     * @memberOf Nornir
     */
    var expected = {};
    /**
     * @description The id for the object to connect to
     * @var
     * @access private
     * @memberOf Nornir
     */
    var config = object.config || { type: "objectID", id: 1};

    /**
     * @description The global callback function. This is being registered if user pass '*' to the registerListener function
     * @see {@link registerListener}
     * @var
     * @access private
     * @memberOf Nornir
     */
    var gcb = function(){};

    for (var i = 0; i < object.expected.length; i++) { // Initialize the expected item with the array from the object parameter
        expected[object.expected[i]] = {
            value: null,
            onChange: function(){}
        };
    }

    var channelListeners = {};

    /**
     * @description The service object. For modification of expected objects (Not in use yet)
     * @var
     * @access private
     * @memberOf Nornir
     */
    this.services = {};


    /**
     * @description Registers callback functions that listens to changes in a sensor's values
     * @var
     * @access public
     * @param {string} name The name of the sensor to register listener to
     * @param {function} callback The callback function to register
     * @memberOf Nornir
     * @return {object} An object with error messages or nothing
     */
    function registerListener(name, callback) {
        console.log("registering");
        if (!expected.hasOwnProperty(name)) {
            if (name === "*" && typeof callback === "function") {
                gcb = callback;
            }
            else {
                return { err: "No expected sensors with that name"}
            }
        }
        else {
            if (typeof callback === "function") {
                expected[name].onChange = callback;
            }
            else {
                return { err: "Second parameter is not a function" }
            }
        }
    }

    this.registerListener = registerListener;

    function threadSender(name, value, mapID) {
        var sender = new Worker('rtw-client/sender.js');
        var to = mapID.type + encodeURIComponent(mapID.id);
        var sendPost = to;
        if( Object.prototype.toString.call(name) === '[object Array]' ) {
            for (var i = 0; i < name.length; i++) {
                //if (i === name.length - 1 && value[i] === "") {
                //    value[i] = " ";
                //}
                sendPost += "&" + encodeURIComponent(name[i]) + "=" + encodeURIComponent(value[i])
            }
        }
        else {
            sendPost += "&" + encodeURIComponent(name) + "=" + encodeURIComponent(value);
        }
        //var url = protocol + server +  path + domain + service;
        //var url = object.url;
        sender.postMessage({
            url: url,
            sendPost: sendPost,
            synxCat: "1",
            readyState: 4
        });
        var ret = 0;
        sender.onmessage = function (res) {
            if (res.hasOwnProperty("err") && ret < 5) {
                ret++;
                sender.postMessage({
                    url: url,
                    sendPost: sendPost,
                    synxCat: "1",
                    readyState: 4
                });
            }
            else {
                sender.terminate();
            }
        }
    }

    /**
     * @description Sends updates on a given set of sensors with given set of values
     * @var
     * @param {string|string[]} name The name or array of names to updates
     * @param {string|string[]} value The value or array of values to update
     * @param {string} [mapID] The username of the person to send to
     * @access private
     * @memberOf Nornir
     */
    function send(name, value, mapID) {
        var conf = {
            type: (mapID && typeof mapID === 'string') ? "objectID=*&mapID=" : "objectID=",
            id: mapID || config.id
        };
        threadSender(name, value, conf);
    }

    this.removeChannelListener = function (cl, channel) {
        delete channelListeners[channel][channelListeners[channel].indexOf(cl)];
    };

    function getObjectId(pathParam, cb) {
        var worker = new Worker('rtw-client/sender.js');
        var returnObject = [];
        var i = 0;
        var param = {
            domain: (pathParam.domain) ? pathParam.domain : null,
            service: (pathParam.service) ? pathParam.service : null
        };
        if (Object.prototype.toString.call(param.domain) === "[object Array]") {
            for (i = 0; i < param.domain; i++) {
                param.domain[i] = param.domain[i].toLowerCase();
            }
        }
        else {
            param.domain = param.domain.toLowerCase();
        }
        if (Object.prototype.toString.call(param.service) === "[object Array]") {
            for (i = 0; i < param.service; i++) {
                param.service[i] = param.service[i].toLowerCase();
            }
        }
        else {
            param.service = param.service.toLowerCase();
        }

        if (!param.domain && !param.service) {
            cb({ err: { message: "No domain or service property in request parameter"}});
            return;
        }
        else if (!username || !password) {
            cb({ err: { message: "No username or password registered"}});
            return;
        }


        var sendPost = "username=" + encodeURIComponent(username) + "&password=" + encodeURIComponent(password);
        var to = protocol + server /* + ":" + port*/ + path;
        to += (param.service) ? param.domain + "/" + param.service : param.domain + "/";
        worker.postMessage({
            url: to,
            sendPost: sendPost,
            synxCat: "20",
            readyState: 4
        });
        worker.onmessage = function(response) {


            var splitted = response.data.trim().split(";");
            var push = {};
            for (var i = 1, j = 0; i < splitted.length / 3; i++) {
                push.domain = (param.domain.indexOf(splitted[j].toLowerCase()) >= 0) ? splitted[j].toLowerCase() : "";
                j++;
                push.service = (param.service.indexOf(splitted[j].toLowerCase()) >= 0) ? splitted[j].toLowerCase() : "";
                j++;
                if (push.domain || push.service) {
                    push.id = splitted[j];
                    returnObject.push(push);
                }
                j++;
                push = {};
            }
            cb(returnObject);
            worker.terminate();

        };
    }

    this.getObjectId = getObjectId;

    this.send = send;

    this.addChannelLister = function(channel, listener){
        if (!channelListeners.hasOwnProperty(channel)) {
            channelListeners[channel] = [];
        }
        channelListeners[channel].push(listener);
    };

    function parseData(data) {
        var values = {};
        for (var i = 0; i < object.expected.length; i++) {
            // console.log(data);
            var node = object.expected[i];
            var el = data.getElementsByTagName(node)[0];
            if (el) {
                values[node] = el.innerHTML;
                expected[node].onChange(el.innerHTML);
                if (channelListeners.hasOwnProperty(node.toLowerCase()) && el.innerHTML !== "") {
                    channelListeners[node.toLowerCase()].forEach(function(cl) {
                        cl(el.innerHTML);
                    })
                }
            }   
        }
	    // console.log(values);
        gcb(values);
    }
    var lastSent = "";
    var resArr = [];
    function parseResponse() {
        var response = resArr.shift();
        while (response) {
            var stringParse = "";
            if (!lastSent) {
                stringParse = response;
            }
            else {
                var index = response.lastIndexOf(lastSent);
                var length = response.length;
                if (index !== -1) {
                    stringParse = response.slice(index + lastSent.length,length);
                }
                else {
                    stringParse = response;
                }
            }
            lastSent = response;
            var stringReplaced = "<start>" + stringParse + "</start>";
            var docParser = new DOMParser();
            var parse = docParser.parseFromString(stringReplaced, "text/xml");
            var rtws = parse.getElementsByTagName("RTW");
            for (var i = 0; i < rtws.length; i++) {
                parseData(rtws[i]);
            }
            response = resArr.shift();
        }
    }

    /**
     * @description Connect to the service and start listen for updates
     * @var
     * @access private
     * @memberOf Nornir
     * @returns {null} Null if the authorization data is not correct
     */
    function connect(cb) {
        var callback = cb || function(){};
        // if (!username || !password || !domain || !path || !service) {
        //     return null;
        // }
        var worker = new Worker('rtw-client/sender.js');
        var post = encodeURIComponent(config.type) + "=" + encodeURIComponent(config.id) +
                    "&username=" + encodeURIComponent(username) + "&password=" + encodeURIComponent(password);
        console.log("post ", post);
        // var url = protocol + server + path + domain + service;
        console.log("url ", url);
        worker.postMessage({
            url: url,
            sendPost: post,
            synxCat: "4",
            readyState: 3
        });
        var called = false;
        if (cb) {
            worker.onmessage = function(res) {
                if (!called) {
                    callback();
                    called = true;
                }
                resArr.push(res.data.trim());
                // console.log(res.data);
                parseResponse();
            }
        }
        else {
            worker.onmessage = function(res) {
                resArr.push(res.data.trim());
                parseResponse();
            }
        }
    }

    this.connect = connect;
    

    function setMapID(objectId, mapId) {
        var returnValue = false;
        if (objectId && mapId) {
            var worker = new Worker('rtw-client/sender.js');
            var sendPost = "objectID=" + encodeURIComponent(objectId) + "&mapID=" + encodeURIComponent(mapId.toLowerCase()) +
                            "&username=" + encodeURIComponent(username) + "&password=" + encodeURIComponent(password);
            var to = protocol + server + path + domain + service;
            worker.postMessage({
                url: to,
                sendPost: sendPost,
                synxCat: "3",
                readyState: 4
            });
            worker.onmessage = function () {
                worker.terminate();
            };
            returnValue = true;
        }
        return returnValue;
    }

    function parseSearch(response) {
        var rtwUnits = response.getElementsByTagName("RTWUnit");
        var unitObject;
        var url;
        var schema;
        var description;
        var node;
        var returnArray = [];
        HTMLCollection.prototype.forEach = function(cb) {
          for (var i = 0; i < this.length; i++) {
              cb(this[i]);
          }
        };
        rtwUnits.forEach(function(unit) {
            unitObject = {};
            url = {};
            schema = [];
            description = "";

            node = unit.getElementsByTagName("URL")[0];
            url.domain = node.textContent.split("/")[0];
            url.service = node.textContent.split("/")[1];
            unitObject.url = url;

            node = unit.getElementsByTagName("ServiceDescription")[0];
            description = node.textContent;
            unitObject.description = description;

            node = unit.getElementsByTagName("RTW")[0].children;
            for (var j = 0; j < node.length; j++) {
                schema.push(node[j].nodeName);
            }
            unitObject.schema = schema;
            returnArray.push(unitObject);
        });
        return returnArray;
    }

    function search(searchString, sServer, sPort, sPath1, sPath2, cb) {
        if (searchString.length >= 3 && (sServer && sPath1 && sPort && sPath2)) {
            var worker = new Worker('rtw-client/sender.js');
            var to = protocol +
                    encodeURIComponent(sServer) +
                    ":" + encodeURIComponent(sPort) + "/" +
                    encodeURIComponent(sPath1) + "/" + encodeURIComponent(sPath2) + "/";
            var sendPost = "searchText=" + encodeURIComponent(searchString);
            var searchArray = [];
            worker.postMessage({
                url: to,
                sendPost: sendPost,
                synxCat: "12",
                readyState: 4
            });
            worker.onmessage = function(res) {
                var parser = new DOMParser();
                var response = parser.parseFromString(res.data,"text/xml");
                searchArray = parseSearch(response);
                cb(searchArray);
                worker.terminate();
            };
        }
    }

    this.testSockets = function() {
        try {
            var test = new WebSocket("ws://cybernetdomain.synxbios.com:8099/RTWServer/Receiver");
        } catch (e) {
            console.log(e)
        }
        test.onerror = function(e) {
            console.log(e);
        }
        test.onopen = function(event) {
            console.log(event);
            var send = {
                domain: "pad",
                service: "Mail",
                objectID: 4,
                user: username,
                password: password
            }
            test.send(JSON.stringify(send));
        };
        test.onmessage = function(event) {
            console.log(event)
        }
    };

    this.search = search;

    this.setMapID = setMapID;
}
