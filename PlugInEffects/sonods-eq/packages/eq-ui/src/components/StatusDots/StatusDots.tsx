import React from 'react';
import styles from './StatusDots.module.css';

export interface StatusDotsProps {
  status?: 'green' | 'amber' | 'red';
  cpuWarning?: boolean;
  overload?: boolean;
}

export const StatusDots: React.FC<StatusDotsProps> = ({
  cpuWarning = false,
  overload = false,
}) => {
  return (
    <div className={styles.trafficLights}>
      <div
        className={`${styles.dot} ${styles.dotGreen}`}
        title="DSP Engine: Active & Real-Time Safe"
      />
      <div
        className={`${styles.dot} ${styles.dotAmber} ${cpuWarning ? styles.active : ''}`}
        title={cpuWarning ? 'Frame Time > 16.6ms' : 'Performance OK'}
      />
      <div
        className={`${styles.dot} ${styles.dotRed} ${overload ? styles.active : ''}`}
        title={overload ? 'Audio Overload / Underrun' : 'Headroom OK'}
      />
    </div>
  );
};
