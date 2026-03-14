import { useState } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            if (item === null) {
                return initialValue;
            }
            
            const parsedItem = JSON.parse(item);

            // For arrays, always return the parsed item (don't merge)
            if (Array.isArray(initialValue) && Array.isArray(parsedItem)) {
                return parsedItem;
            }

            // For objects, merge with initial value to handle data structure changes over time.
            // This prevents crashes when new properties are added to a stored object.
            if (typeof initialValue === 'object' && initialValue !== null && !Array.isArray(initialValue) && typeof parsedItem === 'object' && parsedItem !== null && !Array.isArray(parsedItem)) {
                return { ...initialValue, ...parsedItem };
            }

            return parsedItem;
        } catch (error) {
            console.error(`Error reading localStorage key “${key}”:`, error);
            return initialValue;
        }
    });

    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(`Error setting localStorage key “${key}”:`, error);
        }
    };

    return [storedValue, setValue];
}
