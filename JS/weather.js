async function fetchRealWeather() {
    try {
        const lat = 13.7563;
        const lon = 100.5018;

        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
        );

        const data = await response.json();

        const currentTemp =
            Math.round(data.current.temperature_2m);

        const humidity =
            data.current.relative_humidity_2m;

        const maxTemp =
            Math.round(data.daily.temperature_2m_max[0]);

        const minTemp =
            Math.round(data.daily.temperature_2m_min[0]);

        const weatherCode =
            data.current.weather_code;

        let conditionText = 'อากาศแจ่มใส';
        let weatherIcon = '☀️';
        let adviceText =
            'แต่งตัวสบายๆ รับแสงแดดได้เลยจ้า ✨';

        if (weatherCode >= 1 && weatherCode <= 3) {
            conditionText = 'มีเมฆบางส่วน';
            weatherIcon = '⛅';
            adviceText =
                'อากาศกำลังดี ใส่เสื้อผ้าโปร่งสบายได้เลยครับ';
        }
        else if (weatherCode >= 51) {
            conditionText = 'มีฝนตก';
            weatherIcon = '🌧️';
            adviceText =
                'ฝนอาจตก พกร่มหรือเสื้อกันฝนออกไปด้วยนะ ☂️';
        }
        else if (currentTemp >= 33) {
            conditionText = 'อากาศร้อนจัด';
            weatherIcon = '🔥';
            adviceText =
                'แดดค่อนข้างแรง แนะนำเสื้อผ้าโปร่งและพกร่มกันแดดครับ';
        }

        document.getElementById('weather-temp').innerText =
            `${currentTemp}°C`;

        document.getElementById('weather-temp-sub').innerText =
            `${minTemp}-${maxTemp}°C`;

        document.getElementById('weather-condition').innerText =
            conditionText;

        document.getElementById('weather-icon').innerText =
            weatherIcon;

        document.getElementById('weather-high-low').innerText =
            `↑ ${maxTemp}°C  ↓ ${minTemp}°C`;

        document.getElementById('weather-humidity').innerText =
            `💧 ${humidity}%`;

        document.getElementById('weather-advice').innerHTML =
            `<span>👕</span> แนะนำ: ${adviceText}`;

    } catch (error) {
        console.error(
            'ไม่สามารถดึงข้อมูลสภาพอากาศได้:',
            error
        );
    }
}