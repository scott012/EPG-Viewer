import React, { useEffect, useState, useRef } from 'react';
import { Paper, Typography, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, CircularProgress, Box, TextField } from '@mui/material';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import './EPGGrid.css'; // Import CSS file for custom styles

dayjs.extend(utc);
dayjs.extend(timezone);

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
    return dayjs(date).tz('America/Vancouver');
};

function generateTimeSlots(startTime, endTime) {
    const slots = [];
    let currentTime = startTime;
    while (currentTime.isBefore(endTime) || currentTime.isSame(endTime)) {
        slots.push(currentTime.format('YYYY-MM-DD HH:mm'));
        currentTime = currentTime.add(30, 'minute');
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
    console.log('Grouped Programs by Channel:', grouped); // Add logging
    return grouped;
}

function EPGGrid({ data }) {
    const [currentTimePosition, setCurrentTimePosition] = useState(0);
    const [selectedProgram, setSelectedProgram] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredData, setFilteredData] = useState(data); // Initialize filteredData state
    const slotWidth = 240; // Width for each 30-minute slot
    const gridRef = useRef(null);
    const latestEndTimeRef = useRef(dayjs().tz('America/Vancouver').subtract(1, 'hour').startOf('hour'));

    // Calculate start and end times dynamically
    const now = dayjs().tz('America/Vancouver').subtract(1, 'hour').startOf('hour');

    useEffect(() => {
        console.log('Starting data fetch simulation...');
        // Simulate data fetching
        setTimeout(() => {
            setLoading(false);
            console.log('Data fetch completed');
        }, 2000); // Simulate a 2-second load time

        Object.keys(data).forEach(date => {
            data[date].forEach(program => {
                const endTime = parseXMLDate(program.endTime);
                if (endTime.isAfter(latestEndTimeRef.current)) {
                    latestEndTimeRef.current = endTime;
                }
            });
        });

        console.log('Processed data:', data);
    }, [data]);

    const timeSlots = generateTimeSlots(now, latestEndTimeRef.current);
    console.log('Time slots:', timeSlots);

    useEffect(() => {
        const updateCurrentTimePosition = () => {
            const currentTimeSlotIndex = dayjs().tz('America/Vancouver').diff(now, 'minute') / 30;
            const position = currentTimeSlotIndex * slotWidth;
            setCurrentTimePosition(position);
        };

        updateCurrentTimePosition();
        const interval = setInterval(updateCurrentTimePosition, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [now, slotWidth]);

    useEffect(() => {
        const handleScroll = () => {
            if (gridRef.current) {
                const currentTimeLine = document.getElementById('current-time-line');
                currentTimeLine.style.top = `${gridRef.current.scrollTop}px`;
                currentTimeLine.style.height = `${gridRef.current.scrollHeight}px`;
            }
        };

        const gridElement = gridRef.current;

        if (gridElement) {
            gridElement.addEventListener('scroll', handleScroll);
            handleScroll(); // Initial call to set height correctly
        }

        return () => {
            if (gridElement) {
                gridElement.removeEventListener('scroll', handleScroll);
            }
        };
    }, []);

    const handleProgramClick = (program) => {
        setSelectedProgram(program);
        setModalOpen(true);
    };

    const handleClose = () => {
        setModalOpen(false);
        setSelectedProgram(null);
    };

    const handleSearch = (event) => {
        setSearchQuery(event.target.value);
        const query = event.target.value.toLowerCase();

        const newFilteredData = {};
        Object.keys(data).forEach(date => {
            const filteredPrograms = data[date].filter(program =>
                program.title.toLowerCase().includes(query)
            );
            if (filteredPrograms.length > 0) {
                newFilteredData[date] = filteredPrograms;
            }
        });

        setFilteredData(newFilteredData);
    };

    const groupedData = searchQuery ? groupProgramsByChannel(filteredData) : groupProgramsByChannel(data);
    const sortedChannels = Object.keys(groupedData).sort();

    console.log('Grouped Data:', groupedData);
    console.log('Sorted Channels:', sortedChannels);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: '#303030' }}>
            <div style={{ flex: '0 1 auto', padding: '20px', borderBottom: '2px solid #505050', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#404040' }}>
                <Typography variant="h6" align="center" style={{ color: '#ffffff' }}>EPG Guide</Typography>
                <TextField
                    variant="outlined"
                    placeholder="Search Programs"
                    value={searchQuery}
                    onChange={handleSearch}
                    style={{ backgroundColor: '#ffffff', borderRadius: '4px' }}
                />
            </div>
            <div id="epg-grid-container" ref={gridRef} style={{ flex: '1 1 auto', overflow: 'auto', position: 'relative' }}>
                <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#404040' }}>
                    <div style={{ display: 'flex', borderBottom: '2px solid #505050', backgroundColor: '#404040' }}>
                        <div className="sticky-column" style={{ minWidth: '200px', borderRight: '2px solid #505050', backgroundColor: '#404040', position: 'sticky', left: 0, zIndex: 11 }}></div>
                        <div style={{ display: 'flex', minWidth: `${timeSlots.length * slotWidth}px`, backgroundColor: '#404040' }}>
                            {timeSlots.map((time, idx) => (
                                <div key={idx} style={{ width: `${slotWidth}px`, textAlign: 'center', color: '#ffffff' }}>
                                    <Typography variant="body2">{dayjs(time).format('MMM DD')}</Typography>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ display: 'flex', borderBottom: '2px solid #505050', backgroundColor: '#404040' }}>
                        <div className="sticky-column" style={{ minWidth: '200px', borderRight: '2px solid #505050', backgroundColor: '#404040', position: 'sticky', left: 0, zIndex: 11 }}></div>
                        <div style={{ display: 'flex', minWidth: `${timeSlots.length * slotWidth}px`, backgroundColor: '#404040' }}>
                            {timeSlots.map((time, idx) => (
                                <div key={idx} style={{ width: `${slotWidth}px`, textAlign: 'center', color: '#ffffff' }}>
                                    <Typography variant="body2">{dayjs(time).format('HH:mm')}</Typography>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div id="current-time-line" style={{ position: 'absolute', top: 0, left: `${currentTimePosition}px`, width: '2px', backgroundColor: 'red', zIndex: 12 }} />
                {sortedChannels.map((channel, index) => (
                    <div key={index} style={{ display: 'flex', borderBottom: '2px solid #505050' }}>
                        <div className="sticky-column" style={{ minWidth: '200px', borderRight: '2px solid #505050', backgroundColor: '#505050', position: 'sticky', left: 0, zIndex: 11 }}>
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
                                const startTime = parseXMLDate(program.startTime);
                                const endTime = parseXMLDate(program.endTime);
                                const durationInMinutes = endTime.diff(startTime, 'minute');
                                const durationInSlots = durationInMinutes / 30;
                                const startSlotIndex = startTime.diff(now, 'minute') / 30;
                                const leftOffset = startSlotIndex * slotWidth;

                                console.log('Program:', program);
                                console.log('Start Time:', startTime.format('YYYY-MM-DD HH:mm'));
                                console.log('End Time:', endTime.format('YYYY-MM-DD HH:mm'));
                                console.log('Left Offset:', leftOffset);

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
                                        onClick={() => handleProgramClick(program)} // Handle program click
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
            {selectedProgram && (
                <Dialog open={modalOpen} onClose={handleClose}>
                    <DialogTitle>{selectedProgram.title || 'Not Available'}</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            <strong>Subtitle:</strong> {selectedProgram.subtitle || 'Not Available'}
                        </DialogContentText>
                        <DialogContentText>
                            <strong>Start Time:</strong> {dayjs(parseXMLDate(selectedProgram.startTime)).tz('America/Vancouver').format('YYYY-MM-DD HH:mm') || 'Not Available'}
                        </DialogContentText>
                        <DialogContentText>
                            <strong>End Time:</strong> {dayjs(parseXMLDate(selectedProgram.endTime)).tz('America/Vancouver').format('YYYY-MM-DD HH:mm') || 'Not Available'}
                        </DialogContentText>
                        <DialogContentText>
                            <strong>Description:</strong> {selectedProgram.description || 'Not Available'}
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose} color="primary">
                            Close
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </div>
    );
}

export default EPGGrid;
