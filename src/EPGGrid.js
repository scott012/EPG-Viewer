import React, { useEffect, useState } from 'react';
import { Grid, Paper, Typography } from '@mui/material';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import './EPGGrid.css'; // Import CSS file for custom styles

dayjs.extend(utc);
dayjs.extend(timezone);

function generateTimeSlots() {
    const slots = [];
    const startTime = dayjs().startOf('day');
    for (let i = 0; i < 48; i++) {
        slots.push(startTime.add(i * 30, 'minute').format('HH:mm'));
    }
    return slots;
}

function groupProgramsByChannel(data) {
    const grouped = {};
    Object.keys(data).forEach(date => {
        data[date].forEach(program => {
            if (!grouped[program.channel]) {
                grouped[program.channel] = [];
            }
            grouped[program.channel].push(program);
        });
    });
    return grouped;
}

const parseXMLDate = (xmlDate) => {
    const year = parseInt(xmlDate.slice(0, 4), 10);
    const month = parseInt(xmlDate.slice(4, 6), 10) - 1; // months are 0-indexed
    const day = parseInt(xmlDate.slice(6, 8), 10);
    const hour = parseInt(xmlDate.slice(8, 10), 10);
    const minute = parseInt(xmlDate.slice(10, 12), 10);
    const second = parseInt(xmlDate.slice(12, 14), 10);
    const offsetSign = xmlDate.slice(15, 16);
    const offsetHour = parseInt(xmlDate.slice(16, 18), 10);
    const offsetMinute = parseInt(xmlDate.slice(18, 20), 10);

    let date = new Date(Date.UTC(year, month, day, hour, minute, second));
    const offsetInMinutes = (offsetHour * 60) + offsetMinute;
    if (offsetSign === '+') {
        date = new Date(date.getTime() - offsetInMinutes * 60000);
    } else {
        date = new Date(date.getTime() + offsetInMinutes * 60000);
    }
    console.log(`Parsed Date: ${xmlDate} -> ${date}`);
    return date;
};

function EPGGrid({ data }) {
    const [currentTimePosition, setCurrentTimePosition] = useState(0);
    const slotWidth = 240; // Updated width for each 30-minute slot

    const groupedData = groupProgramsByChannel(data);
    const timeSlots = generateTimeSlots();

    useEffect(() => {
        const updateCurrentTimePosition = () => {
            const now = dayjs().tz('America/Vancouver');
            const minutesFromMidnight = now.hour() * 60 + now.minute();
            const currentTimeSlotIndex = minutesFromMidnight / 30;
            const position = currentTimeSlotIndex * slotWidth;
            setCurrentTimePosition(position);
        };

        updateCurrentTimePosition();
        const interval = setInterval(updateCurrentTimePosition, 60000); // Update every minute

        return () => clearInterval(interval);
    }, []);

    const sortedChannels = Object.keys(groupedData).sort();

    return (
        <div style={{ overflowX: 'auto', backgroundColor: '#303030', padding: '20px', position: 'relative' }}>
            <Grid container spacing={2} padding={2} style={{ borderBottom: '2px solid #505050' }}>
                <Grid item xs={2} style={{ borderRight: '2px solid #505050', backgroundColor: '#404040' }} />
                <Grid item xs={10} style={{ display: 'flex', justifyContent: 'center', backgroundColor: '#404040' }}>
                    <Typography variant="h6" align="center" style={{ color: '#ffffff' }}>Date: {Object.keys(data)[0]}</Typography>
                </Grid>
            </Grid>
            <div style={{ display: 'flex', borderBottom: '2px solid #505050', position: 'relative' }}>
                <div style={{ minWidth: '200px', borderRight: '2px solid #505050', backgroundColor: '#404040' }}></div>
                <div style={{ display: 'flex', minWidth: `${timeSlots.length * slotWidth}px`, backgroundColor: '#404040', position: 'relative' }}>
                    {timeSlots.map((time, idx) => (
                        <div key={idx} style={{ width: `${slotWidth}px`, textAlign: 'center', color: '#ffffff' }}>
                            <Typography variant="body2">{time}</Typography>
                        </div>
                    ))}
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${currentTimePosition}px`, width: '2px', backgroundColor: 'red' }} />
                </div>
            </div>
            {sortedChannels.map((channel, index) => (
                <div key={index} style={{ display: 'flex', borderBottom: '2px solid #505050' }}>
                    <div style={{ minWidth: '200px', borderRight: '2px solid #505050', backgroundColor: '#505050' }}>
                        <Paper elevation={3} style={{ padding: '16px', backgroundColor: '#404040' }}>
                            <Typography
                                variant="h6"
                                style={{
                                    color: '#ffffff',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    fontSize: '16px', // Adjust font size as needed
                                }}
                            >
                                {channel}
                            </Typography>
                        </Paper>
                    </div>
                    <div style={{ display: 'flex', minWidth: `${timeSlots.length * slotWidth}px`, position: 'relative', backgroundColor: '#303030' }}>
                        {groupedData[channel].map((program, idx) => {
                            const startTimeUTC = parseXMLDate(program.startTime);
                            const endTimeUTC = parseXMLDate(program.endTime);
                            const startTimeVancouver = dayjs(startTimeUTC).tz('America/Vancouver');
                            const endTimeVancouver = dayjs(endTimeUTC).tz('America/Vancouver');
                            const durationInMinutes = endTimeVancouver.diff(startTimeVancouver, 'minute');
                            const durationInSlots = durationInMinutes / 30;
                            const startSlotIndex = Math.floor((startTimeVancouver.hour() * 60 + startTimeVancouver.minute()) / 30);
                            const leftOffset = startSlotIndex * slotWidth;  // Adjust left position to account for channel column width

                            // Log the calculated values for debugging
                            console.log(`Program: ${program.title}`);
                            console.log(`Start Time (UTC): ${startTimeUTC}`);
                            console.log(`End Time (UTC): ${endTimeUTC}`);
                            console.log(`Start Time (Vancouver): ${startTimeVancouver.format('HH:mm')}`);
                            console.log(`End Time (Vancouver): ${endTimeVancouver.format('HH:mm')}`);
                            console.log(`Duration in Minutes: ${durationInMinutes}`);
                            console.log(`Duration in Slots: ${durationInSlots}`);
                            console.log(`Start Slot Index: ${startSlotIndex}`);
                            console.log(`Left Offset: ${leftOffset}px`);

                            return (
                                <div
                                    key={idx}
                                    style={{
                                        position: 'absolute',
                                        left: `${leftOffset}px`,
                                        width: `${durationInSlots * slotWidth}px`,
                                        height: '80px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        whiteSpace: 'normal',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        padding: '1px', // Added padding around program cells
                                        backgroundColor: '#303030', // Darker padding color
                                    }}
                                >
                                    <div
                                        className="program-cell" // Added class for program cell styling
                                        style={{
                                            backgroundColor: '#505050', // Background color for the program cells
                                            width: '100%',
                                            height: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                            padding: '4px', // Padding inside program cells
                                        }}
                                    >
                                        <Typography variant="body2" className="program-title" style={{ fontSize: '14px', color: '#ffffff', lineHeight: '1.2' }}>
                                            {program.title}
                                        </Typography>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default EPGGrid;
