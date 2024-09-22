# FreeDogs-BOT

FreeDogs is a Node.js application that interacts with the FreeDogs bot API. It automates tasks such as collecting coins, completing tasks, and managing tokens for multiple user accounts.

## Features

- Automatic token management and renewal
- Coin collection
- Task completion
- Multi-account support

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js (v12 or higher) installed on your machine
- A FreeDogs bot account [Register here](https://t.me/theFreeDogs_bot/app?startapp=ref_k4UaSZgv)

## Installation

1. Clone this repository:

   ```
   git clone https://github.com/Galkurta/FreeDog-BOT.git
   ```

2. Navigate to the project directory:

   ```
   cd FreeDog-BOT
   ```

3. Install the required dependencies:
   ```
   npm install
   ```

## Configuration

1. Edit `data.txt` file in the project root directory.
2. Add your FreeDogs bot initialization data to `data.txt`, one entry per line.

## Usage

To run the FreeDogs:

```
node main.js
```

The application will start processing accounts, collecting coins, and completing tasks automatically. The status will be displayed in a formatted table in the console.

## Contributing

Contributions to the FreeDogs project are welcome. Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This project is for educational purposes only. Use at your own risk. The developers are not responsible for any consequences resulting from the use of this software.
