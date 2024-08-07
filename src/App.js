import React, { useEffect, useState } from 'react';
import EPGGrid from './EPGGrid';
import dayjs from 'dayjs';

function App() {
    const [epgData, setEpgData] = useState([]);

    useEffect(() => {
        fetch('/epg.xml')
            .then(response => response.text())
            .then(data => {
                const parser = new DOMParser();
                const xml = parser.parseFromString(data, 'text/xml');
                const programs = Array.from(xml.getElementsByTagName('programme')).map(program => ({
                    title: program.getElementsByTagName('title')[0].textContent,
                    startTime: program.getAttribute('start'),
                    endTime: program.getAttribute('stop'),
                    channel: program.getAttribute('channel')
                }));

                const groupedByDate = programs.reduce((acc, program) => {
                    const date = dayjs(program.startTime.substring(0, 8)).format('YYYY-MM-DD');
                    if (!acc[date]) {
                        acc[date] = [];
                    }
                    acc[date].push(program);
                    return acc;
                }, {});

                setEpgData(groupedByDate);
            });
    }, []);

    return <EPGGrid data={epgData} />;
}

export default App;
