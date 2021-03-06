/*
 * Copyright (C) 2011  Maxime VALY
 * 
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License 
 * version 2 as published by the Free Software Foundation.
 */

//
// Toolbox
var tools = tools || {};
tools.findElem = function(arr, elem) {
  if (arr && elem)
    for (i = 0; i < arr.length; i++)
      if (arr[i] === elem)
        return i;
  return -1;
};
// https://developer.mozilla.org/En/Using_XMLHttpRequest#Example:_Asynchronous_request
tools.xhr = function(url, callback) {
  var request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.onreadystatechange = function (aEvt) {
    if (request.readyState == 4) {
       if (request.status == 200) {
         // automatically handle XML or JSON
         request.responseXML && callback(request.responseXML) || callback(JSON.parse(request.responseText));
         // TODO test for the JSON parser presence
       } else {
         console && console.log && console.log('Error', request.statusText);
       }
    }
  };
  request.send(null);
};
// Specific AJAX tool for JSONP calls, shortened version of the work of Sky Sanders
// http://stackapps.com/questions/891/how-to-call-the-api-via-jsonp-in-plain-old-javascript
tools.jsonp_callbackId = 0;
tools.jsonp_callbacks = tools.jsonp_callbacks || {};
tools.jsonp = function(url, success, error) {
  var callBackName = "_callback" + this.jsonp_callbackId++;
  // setup the callback
  tools.jsonp_callbacks[callBackName] = function(data) {
      delete tools.jsonp_callbacks[callBackName];
      if (data.error) {
          if (error) {
              data.error.callback = callBackName;
              error(data.error);
          };
      } else {
          success(data);
      };
  };

  // send the request
  var scr = document.createElement("script");
  scr.type = "text/javascript";
  scr.src = url + "?jsoncallback=tools.jsonp_callbacks." + callBackName;
  var head = document.getElementsByTagName("head")[0];
  head.insertBefore(scr, head.firstChild);

  window.setTimeout(function() {
      if (typeof tools.jsonp_callbacks[callBackName] == "function") {
          // replace success with null callback in case the request is just very latent.
          that[callBackName] = function(data) {
              delete tools.jsonp_callbacks[callBackName];
          };
          // call the error callback
          error && error({ code: 408, message: "Request Timeout", callback: callBackName });
          // set a longer timeout to safely clean up the unused callback.
          window.setTimeout(function() {
              if (typeof tools.jsonp_callbacks[callBackName] == "function") {
                  delete tools.jsonp_callbacks[callBackName];
              };
          }, 60000);
      };
  }, 10000); // default to 10 second timeout
};

//
// JS Events
tools._appEvents = {};
tools.register = function(event, callback) {
  if (!callback || !typeof callback === 'function')
    return;
  var callbacks = tools._appEvents[event] || [];
  callbacks.push(callback);
  tools._appEvents[event] = callbacks;
};
tools.unregister = function(event, callback) {
  var pos = tools.findElem(tools._appEvents[event], callback);
  pos && tools._appEvents[event].pop(pos);
};
tools.fire = function(event, data) {
  var callbacks = tools._appEvents && tools._appEvents[event];
  if (callbacks) {
    for (i = 0; i < callbacks.length; i++) {
      callbacks[i](event, data);
    }
  }
};

//
// DOM Events
tools.addListener = function(elem, baseName, handler) {
  if (elem.addEventListener) {
    elem.addEventListener(baseName, handler, false);
  } else if (element.attachEvent) {
    elem.attachEvent('on' + baseName, handler);
  }
};


//
// wthr.Weather
var wthr = wthr || {};
wthr.Weather = function() {
  
  this.apiKey = '2a515c6436e75cdebcab1691636c3bf2'; // this app is named g9nWthr

  function initIcons() {
    // w[code_from_yahoo_weather] = 'stardock_image_file'
    // http://developer.yahoo.com/weather/
    w = [];
    w[0] = w[1] = w[2] = '23';
    w[3] = w[4] = '38';
    w[5] = '05';
    w[6] = w[7] = '07';
    w[8] = '08';
    w[9] = '09';
    w[10] = '10';
    w[11] = w[12] = '11';
    w[13] = w[14] = '13';
    w[15] = '42';
    w[16] = '43';
    w[17] = '06';
    w[18] = '18';
    w[19] = '19';
    w[20] = '20';
    w[21] = '21';
    w[22] = '22';
    w[23] = '23';
    w[24] = '24';
    w[25] = '25';
    w[26] = '26';
    w[27] = '27';
    w[28] = '28';
    w[29] = '29';
    w[30] = '30';
    w[31] = '31';
    w[32] = '32';
    w[33] = '33';
    w[34] = '34';
    w[35] = '35';
    w[36] = '36';
    w[37] = '37';
    w[38] = w[39] = '38';
    w[40] = '40';
    w[41] = '41';
    w[42] = '42';
    w[43] = '43';
    w[44] = '44';
    w[45] = '00';
    w[46] = '05';
    w[47] = '37';
    return w;
  }
  this.w = initIcons();

  var that = this;
  tools.register('geo:html5:success', function(event, data) {
    that.displayLocation(data);
  });
  tools.register('geo:html5:error', function(event, data) {
    that.displayLocationError(data);
  });  
  tools.register('geo:ip:success', function(event, data) {
    that.displayLocation(data);
  });
  tools.register('geo:ip:error', function(event, data) {
    that.displayLocationError(data);
  });
  tools.register('yahoo:location:success', function(event, data) { 
    that.updateLocation(data);
  });
  tools.register('yahoo:location:success', function(event, data) { 
    that.fetchWeather(data);
  });
  tools.register('yahoo:location:success', function(event, data) { 
    that.fetchPhoto(data);
  });
  tools.register('yahoo:weather:success', function(event, data) { 
    that.readWeather(data); // data is a XML document
  });
  
  document.getElementById('html5').style.display = 'none';
  document.getElementById('ip').style.display = 'none';
  
  if (navigator.geolocation) {
    this.fetchPositionHTML5();
  } else {
    this.fetchPositionIP();
  }
};

wthr.Weather.prototype = {

  fetchPositionHTML5: function() {
    var geoSuccess = function(data) {
      document.getElementById('html5').style.display = 'none';
      document.getElementById('ip').style.display = 'inline';
      tools.fire('geo:html5:success', data);
    };
    var geoError = function(data) {
      document.getElementById('html5').style.display = 'inline';
      document.getElementById('ip').style.display = 'none';
      tools.fire('geo:html5:error', data);
    };
    g9n.fetchPositionHTML5(geoSuccess, geoError);
  },
  
  fetchPositionIP: function() {
    var geoSuccess = function(data) {
      tools.fire('geo:ip:success', data);
    };
    var geoError = function(data) {
      alert(data);
    };
    g9n.fetchPositionIP(geoSuccess, geoError);
  },
  
  displayLocationError: function(msg) { // TODO handle errors
    var s = document.getElementById('status');
    s.innerHTML = (typeof msg == 'string' ? msg : 'failed');
    s.className = 'fail';
  },
  
  displayLocation: function(coords) {
    var statusSpan = document.getElementById('status');
    if (statusSpan && statusSpan.className == 'success') {
      // not sure why we're hitting this twice in FF, I think it's to do with a cached result coming back    
      return;
    }
    
    // don't bother displaying a status if the HTML is not correct
    if (statusSpan) {
      statusSpan.className = 'success';
      statusSpan.firstChild.nodeValue = 'Almost found...';    
    }
    
    this.queryWOEID(coords.latitude, coords.longitude);
  },

  queryWOEID: function(lat, lon) {
    var success = function(data) {
      tools.fire('yahoo:location:success', data);
    };
    var error = function(data) {
      tools.fire('yahoo:location:error', data);
    };
    g9n.findPlace(lat, lon, success, error, this.apiKey);
  },

  updateLocation: function(data) {
    var place = data.query.results.place;
    var mapLink = 'http://maps.google.com/?ll=' + data.latitude + ',' + data.longitude + '&spn=0.00773,0.019269'; // this last part is the zoom (0.123707,0.308304 is higher)
    var where = place.locality1 && place.locality1.content || place.name;
    var out = 'You are in <a href="' + mapLink + '" title="See a map of your location">' + where + '</a>! (' + 
    place.country.content + ')';
    document.getElementById('location-message').innerHTML = out;
  },
  
  fetchWeather: function(data) {
    var place = data.query.results.place;
    var woeid = place.woeid;
    var units = (place.country.code == 'US' ? 'f' : 'c');
    
    // We can't use Yahoo! Weather API directly because of Access-Control-Allow-Origin
    // http://developer.yahoo.com/weather/
    // https://developer.mozilla.org/en/http_access_control
    // So we use a PHP proxy 
    // http://developer.yahoo.com/javascript/howto-proxy.html#phpproxy
    function getProxyURL(proxyFilename) {
      var proxyFilename = proxyFilename || 'proxy.php';
      // can be http://localhost/weather/index.html or http://localhost/weather/index or http://localhost/weather/
      var pagePath = location.href.substring(0, location.href.lastIndexOf("/")+1);
      return pagePath + proxyFilename;
    }
    // the web services request minus the domain name
    var path = 'forecastrss?w=' + woeid + '&u=' + units;
    // the full path to the PHP proxy
    var url = getProxyURL() + '?yws_path=' + encodeURIComponent(path);
    
    var callback = function(data) {
      tools.fire('yahoo:weather:success', data);
    };
    tools.xhr(url, callback);
  },

  readWeather: function(xmlDoc) {
    try {
      // parsing the RSS feed http://www.jzferreira.com/blog/?p=21
      var weather = 'http://xml.weather.yahoo.com/ns/rss/1.0';
      var geo = 'http://www.w3.org/2003/01/geo/wgs84_pos#';
      var yahoo = {};
      
      var location = xmlDoc.getElementsByTagNameNS(weather, 'location')[0];
      yahoo['city'] = location.getAttribute('city');
      yahoo['region'] = location.getAttribute('region');
      yahoo['country'] = location.getAttribute('country');
      
      var units = xmlDoc.getElementsByTagNameNS(weather, 'units')[0];
      yahoo['units_temp'] = units.getAttribute('temperature');
      
      var condition = xmlDoc.getElementsByTagNameNS(weather, 'condition')[0];
      yahoo['condition_text'] = condition.getAttribute('text');
      yahoo['condition_code'] = condition.getAttribute('code');
      yahoo['condition_temp'] = condition.getAttribute('temp');
      yahoo['condition_date'] = condition.getAttribute('date');
      
      var link = xmlDoc.getElementsByTagName('link')[0];
      var weatherUrl = link.textContent;
      
      // Use a nice weather image from http://www.stardock.com/weather.asp
      var imagesPath = 'stardock_images/';
      var imageFile = imagesPath + this.w[yahoo['condition_code']] + '.png'
      var html = '<div id="weather-today">' +
        '<a href="' + weatherUrl + '?unit=' + yahoo['units_temp'] + '">' +
        ' <img id="weatherPicto" src="' + imageFile + '" title="'+ yahoo['condition_text'] +'" ></img>' +
        '</a><span id="temperature">' + yahoo['condition_temp'] + '°' + yahoo['units_temp'] + '</span>' + 
        '</div>';

      // get weather for the 2 upcoming days
      var forecasts = xmlDoc.getElementsByTagNameNS(weather, 'forecast');
      if (forecasts.length > 0) {
        var html = html + '<div id="weather-forecasts">'
        var yahoo_forecast = [];
        for (var i = 0; i < forecasts.length; i++) {
          var day = forecasts[i].getAttribute('day');
          var date = forecasts[i].getAttribute('date');
          var low = forecasts[i].getAttribute('low');
          var high = forecasts[i].getAttribute('high');
          var text = forecasts[i].getAttribute('text');
          var code = forecasts[i].getAttribute('code');
          var imageFile = imagesPath + this.w[code] + '.png'
          html +=   '<div id="' + day + '" class="forecasts">'+
                    '  <div class="forecast-content-wrappers">' +
                    '    <img class="forecast-picto" src="' + imageFile + '" title="'+ text +'" ></img>' +
                    '    <p>' +
                    '      <span class="forcasts-dates">' + day + '<span class="forcasts-full-dates">, ' + date + '</span></span>&nbsp;<span class="forcasts-temps">' + low + '°' + yahoo['units_temp'] + ' / ' + high + '°' + yahoo['units_temp'] + '</span>' + 
                    '      <span class="forcasts-descriptions">' + text + '</span>' +  
                    '    </p>' + 
                    '  </div>' +
                    '  <div class="clear"></div>' +
                    '</div>';
          if (i == 2) {
            break; // limit to 2 days
          }
        }
        html = html + '</div>';
      }
      html = html + '<div class="clear"></div>';

      var divWeather = document.getElementById('weather');
      divWeather.innerHTML = '<div id="weather-wrapper" class="">' + html + '</div>';
    } catch(e) {
        // err :/
    }
  },
  
  fetchPhoto: function(data) {
    var place = data.query.results.place;
    // Get a photo from Flickr
    var lat = data.latitude;
    var lon = data.longitude;
    var ONE_YEAR = 220147200;
    var offset = ONE_YEAR * Math.floor(Math.random()*5);
    var todayTimestamp = new Date().getTime();
    var max_upload_date = todayTimestamp - offset;
    // TODO something smarter to get better photos
    var yql = 'select * from flickr.photos.search(0,200) where ' + 
      'has_geo="true" and lat="' + lat + '" and lon="' + lon + 
      '" and radius="20" and max_upload_date=' + max_upload_date + 
      ' and api_key=' + this.apiKey + ';';
    var url = 'http://query.yahooapis.com/v1/public/yql?' +
      '&q=' + encodeURIComponent(yql) + '&format=json&callback=' +
      '&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys';
    tools.xhr(url, this.readFlickrImgResponse);
  },
  
  readFlickrImgResponse: function(data){
    if (data.query.results) {
      var randomId = Math.floor(Math.random()*data.query.results.photo.length);
      var photo = data.query.results.photo[randomId];
      var url = 'http://farm' + photo.farm + '.static.flickr.com/' + photo.server + '/' + photo.id + '_' + photo.secret + '.jpg';
      var imageHTML = ''+
      '<a href="http://www.flickr.com/photos/' + photo.owner + '/' + photo.id + '">' +
      '<img id="photo" src="' + url + '" /' + '></a>' +
      '<p id="imgtitle">' + photo.title + '</p>';
      
      var flickr = function(id) {
        if (document.getElementById(id)) {
          return document.getElementById(id);
        }
        var flickr = document.createElement('article');
        flickr.id = id;
        return flickr;
      }('fromflickr');
      flickr.innerHTML = imageHTML;
      
      var div = document.getElementById('geoposition');
      div.appendChild(flickr);
    }
  }
};

var myWeather = new wthr.Weather();
tools.addListener(document.getElementById('html5'), 'click', function(e) {
  document.getElementById('html5').style.display = 'none';
  document.getElementById('ip').style.display = 'inline';
  myWeather.fetchPositionHTML5();
  e.preventDefault();
});
tools.addListener(document.getElementById('ip'), 'click', function(e) {
  document.getElementById('html5').style.display = 'inline';
  document.getElementById('ip').style.display = 'none';
  myWeather.fetchPositionIP();
  e.preventDefault();
});
