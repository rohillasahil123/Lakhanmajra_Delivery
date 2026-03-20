/**
 * Centralized SVG icons for User management
 * This is exported from UserIcons.tsx
 */

// Export from the TSX file
import React from 'react';

export const UserIcons = {
  Search: () =>
    React.createElement(
      'svg',
      { width: '13', height: '13', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2' },
      React.createElement('circle', { cx: '11', cy: '11', r: '8' }),
      React.createElement('line', { x1: '21', y1: '21', x2: '16.65', y2: '16.65' })
    ),
  Plus: () =>
    React.createElement(
      'svg',
      { width: '13', height: '13', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2.5' },
      React.createElement('line', { x1: '12', y1: '5', x2: '12', y2: '19' }),
      React.createElement('line', { x1: '5', y1: '12', x2: '19', y2: '12' })
    ),
  ChevDown: () =>
    React.createElement(
      'svg',
      { width: '11', height: '11', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2.5' },
      React.createElement('polyline', { points: '6 9 12 15 18 9' })
    ),
  ChevLeft: () =>
    React.createElement(
      'svg',
      { width: '12', height: '12', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2.5' },
      React.createElement('polyline', { points: '15 18 9 12 15 6' })
    ),
  ChevRight: () =>
    React.createElement(
      'svg',
      { width: '12', height: '12', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2.5' },
      React.createElement('polyline', { points: '9 18 15 12 9 6' })
    ),
  Users: () =>
    React.createElement(
      'svg',
      { width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2' },
      React.createElement('path', { d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' }),
      React.createElement('circle', { cx: '9', cy: '7', r: '4' }),
      React.createElement('path', { d: 'M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' })
    ),
  Export: () =>
    React.createElement(
      'svg',
      { width: '12', height: '12', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2.2' },
      React.createElement('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
      React.createElement('polyline', { points: '7 10 12 15 17 10' }),
      React.createElement('line', { x1: '12', y1: '15', x2: '12', y2: '3' })
    ),
  Eye: () =>
    React.createElement(
      'svg',
      { width: '13', height: '13', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2' },
      React.createElement('path', { d: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' }),
      React.createElement('circle', { cx: '12', cy: '12', r: '3' })
    ),
  Edit: () =>
    React.createElement(
      'svg',
      { width: '13', height: '13', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2' },
      React.createElement('path', { d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' }),
      React.createElement('path', { d: 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' })
    ),
  Trash: () =>
    React.createElement(
      'svg',
      { width: '13', height: '13', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2' },
      React.createElement('polyline', { points: '3 6 5 6 21 6' }),
      React.createElement('path', { d: 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' }),
      React.createElement('path', { d: 'M10 11v6M14 11v6' })
    ),
  Power: () =>
    React.createElement(
      'svg',
      { width: '13', height: '13', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2' },
      React.createElement('path', { d: 'M18.364 5.636a9 9 0 11-12.728 0' }),
      React.createElement('line', { x1: '12', y1: '3', x2: '12', y2: '12' })
    ),
  Lock: () =>
    React.createElement(
      'svg',
      { width: '13', height: '13', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2' },
      React.createElement('rect', { x: '3', y: '11', width: '18', height: '10', rx: '2' }),
      React.createElement('path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' })
    ),
  Unlock: () =>
    React.createElement(
      'svg',
      { width: '13', height: '13', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2' },
      React.createElement('rect', { x: '3', y: '11', width: '18', height: '10', rx: '2' }),
      React.createElement('path', { d: 'M7 11V7a5 5 0 0 1 9.7-1' }),
      React.createElement('path', { d: 'M16 11h1' })
    ),
};

