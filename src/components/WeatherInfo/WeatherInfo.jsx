import React, { useState, useEffect } from "react";
import "./WeatherInfo.css";
import { API_KEY } from "../../../config";

const WeatherInfo = ({ location, date }) => {
  const [weatherData, setWeatherData] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [unit, setUnit] = useState("metric");
  const [error, setError] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayIndex = new Date(date).getDay();

  useEffect(() => {
    if (location && date) {
      fetchWeatherData(location, date);
    }
  }, [location, date, unit]);

  const fetchWeatherData = async (city, date) => {
    try {
      setError(false);
      const trimmedCity = city.trim();
      const formattedCity =
        trimmedCity.toLowerCase() === "visakhapatnam" ? "Visakhapatnam,IN" : trimmedCity;

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${formattedCity}&appid=${API_KEY}&units=${unit}`
      );

      const data = await response.json();

      if (data.cod !== 200) {
        setError(true);
        return;
      }

      setWeatherData(data);
      fetchForecastData(data.coord.lat, data.coord.lon, date);
    } catch (err) {
      console.error("Error fetching weather:", err);
      setError(true);
    }
  };

  const fetchForecastData = async (lat, lon, date) => {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${unit}`
      );
      const data = await res.json();

      const targetDate = new Date(date).toISOString().split("T")[0];
      const filtered = data.list.filter((item) =>
        item.dt_txt.startsWith(targetDate)
      );

      const uniqueDays = [];
      const nextDays = data.list.filter((item) => {
        const itemDay = new Date(item.dt_txt).getDate();
        if (!uniqueDays.includes(itemDay)) {
          uniqueDays.push(itemDay);
          return true;
        }
        return false;
      });

      setForecastData(nextDays.slice(1, 5));
    } catch (err) {
      console.error("Error fetching forecast:", err);
      setError(true);
    }
  };

  const speakWeather = () => {
    if (weatherData && !isSpeaking) {
      const synth = window.speechSynthesis;
      const temp = Math.round(weatherData.main.temp);
      const desc = weatherData.weather[0].description;
      const speech = `The weather in ${weatherData.name} is ${temp} degrees ${
        unit === "metric" ? "Celsius" : "Fahrenheit"
      } with ${desc}.`;
      const utterance = new SpeechSynthesisUtterance(speech);
      setIsSpeaking(true);
      synth.speak(utterance);
      utterance.onend = () => setIsSpeaking(false);
    }
  };

  const toggleUnit = () => {
    setUnit(unit === "metric" ? "imperial" : "metric");
  };

  const getTempUnit = () => (unit === "metric" ? "°C" : "°F");

  return (
    <>
      {location && <h1 style={{ paddingTop: "20px" }}>Weather Information</h1>}

      {error && (
        <p style={{ color: "red", textAlign: "center" }}>
          Error fetching weather. Please check the location or try again later.
        </p>
      )}

      {!error && weatherData ? (
        <div className={`WeatherInfo ${weatherData.weather[0].main.toLowerCase()}`}>
          <div className="ForecastBox">
            {/* LEFT SIDE */}
            <div className="left-section">
              <h2 className="day">{formattedDate}</h2>
              <img
                src={`https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@4x.png`}
                alt="weather-icon"
                className="weather-icon"
              />
              <h2 className="temp">
                {Math.round(weatherData.main.temp)}
                {getTempUnit()}
              </h2>
              <h3 className="cloud">{weatherData.weather[0].description}</h3>
              <button className="btn" onClick={speakWeather}>
                {isSpeaking ? "Speaking..." : "🔊 Voice"}
              </button>
              <button className="btn" onClick={toggleUnit}>
                Switch to {unit === "metric" ? "°F" : "°C"}
              </button>
            </div>

            {/* RIGHT SIDE */}
            <div className="right-section">
              <div className="info-box">
                <span className="label">City</span>
                <span className="value">{weatherData.name}</span>
              </div>
              <div className="info-box">
                <span className="label">Temperature</span>
                <span className="value">
                  {Math.round(weatherData.main.temp)}
                  {getTempUnit()}
                </span>
              </div>
              <div className="info-box">
                <span className="label">Humidity</span>
                <span className="value">{weatherData.main.humidity}%</span>
              </div>
              <div className="info-box">
                <span className="label">Wind Speed</span>
                <span className="value">
                  {weatherData.wind.speed} {unit === "metric" ? "Km/h" : "mph"}
                </span>
              </div>

              <div className="forecast-box">
                {forecastData.map((item, idx) => {
                  const day = new Date(item.dt_txt).getDay();
                  return (
                    <div
                      key={idx}
                      className={`forecast-item ${day === todayIndex ? "active" : ""}`}
                    >
                      <img
                        src={`https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png`}
                        alt="forecast-icon"
                      />
                      <span className="forecast-day">{days[day]}</span>
                      <p className="forecast-temp">
                        {Math.round(item.main.temp)} {getTempUnit()}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : !error ? (
        <p style={{ textAlign: "center" }}>Loading weather data...</p>
      ) : null}
    </>
  );
};

export default WeatherInfo;
