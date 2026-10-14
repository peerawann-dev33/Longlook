// js/weather.js - ดึงและอัปเดตสภาพอากาศให้ตรงกับ ID ใน index.html
async function updateWeather(lat = 13.7563, lon = 100.5018) {
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto`);
    const data = await res.json();

    if (data && data.current_weather) {
      const temp = Math.round(data.current_weather.temperature);
      const maxTemp = data.daily ? Math.round(data.daily.temperature_2m_max[0]) : temp + 2;
      const minTemp = data.daily ? Math.round(data.daily.temperature_2m_min[0]) : temp - 2;

      // อัปเดต Element ตาม ID ใน index.html
      const weatherTemp = document.getElementById('weather-temp');
      const weatherTempSub = document.getElementById('weather-temp-sub');
      const weatherCondition = document.getElementById('weather-condition');
      const weatherHighLow = document.getElementById('weather-high-low');
      const weatherHumidity = document.getElementById('weather-humidity');
      const weatherAdvice = document.getElementById('weather-advice');

      if (weatherTemp) weatherTemp.innerText = `${temp}°C`;
      if (weatherTempSub) weatherTempSub.innerText = `${temp}°C`;
      if (weatherCondition) weatherCondition.innerText = 'แจ่มใส / มีแดดจัด';
      if (weatherHighLow) weatherHighLow.innerText = `↑ ${maxTemp}°C ↓ ${minTemp}°C`;
      if (weatherHumidity) weatherHumidity.innerText = `💧 65%`;
      if (weatherAdvice) weatherAdvice.innerHTML = `<span>👕</span> สภาพอากาศเหมาะกับการแต่งกายลุคโปร่งสบาย (${temp}°C)`;
    }
  } catch (error) {
    console.error('Weather Fetch Error:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => updateWeather(pos.coords.latitude, pos.coords.longitude),
      () => updateWeather()
    );
  } else {
    updateWeather();
  }
});