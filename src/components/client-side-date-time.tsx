"use client"

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Timestamp } from 'firebase/firestore';

type ClientSideDateTimeProps = {
    date: Date | Timestamp;
    showTime?: boolean;
    timeOnly?: boolean;
};

export function ClientSideDateTime({ date, showTime = false, timeOnly = false }: ClientSideDateTimeProps) {
    const [formattedDate, setFormattedDate] = useState('');

    useEffect(() => {
        // This code runs only on the client, after hydration
        try {
            const dateObj = date instanceof Timestamp ? date.toDate() : date;
            
            const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            // The date from firestore is UTC, so we convert it to the local timezone for display
            const zonedDate = toZonedTime(dateObj, timeZone);

            let formatString = 'dd/MM/yyyy';
            if (timeOnly) {
                formatString = 'HH:mm';
            } else if (showTime) {
                formatString = 'dd/MM/yyyy HH:mm';
            }
            
            setFormattedDate(format(zonedDate, formatString));

        } catch (e) {
            console.error("Invalid date for formatting:", date);
            setFormattedDate('Data inválida');
        }
    }, [date, showTime, timeOnly]);

    if (!formattedDate) {
        // Return a placeholder or null while waiting for client-side render
        return null;
    }

    return <>{formattedDate}</>;
}
