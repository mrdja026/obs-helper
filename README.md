# Bolt Expo Starter

This is a React Native mobile application built with Expo, featuring a modern tech stack and various useful features.

## Tech Stack

- React Native
- Expo (SDK 52)
- TypeScript
- Expo Router for navigation
- Various Expo packages for functionality like camera, blur effects, and more

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (Latest LTS version recommended)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for Mac users) or Android Studio (for Android development)

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd [project-directory]
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

## Running the Application

### Development Mode

To start the development server:

```bash
npm run dev
# or
yarn dev
```

This will start the Expo development server. You can then:
- Press `i` to open in iOS simulator
- Press `a` to open in Android emulator
- Scan the QR code with your phone (using Expo Go app) to run on your physical device

### Web Build

To create a web build:

```bash
npm run build:web
# or
yarn build:web
```

## Project Structure

- `/app` - Main application code and screens
- `/components` - Reusable React components
- `/assets` - Static assets like images and fonts
- `/constants` - Application constants and configuration
- `/hooks` - Custom React hooks
- `/types` - TypeScript type definitions

## Features

- Modern UI with blur effects and gradients
- Camera functionality
- Web browser integration
- Gesture handling
- Safe area management
- SVG support
- WebView capabilities
- OBS WebSocket integration

## Development

The project uses TypeScript for type safety and better development experience. Make sure to:
- Run `npm run lint` to check for code style issues
- Follow the existing code structure and patterns
- Use the provided components and hooks when possible

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request

## License

[Add your license information here] 