const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const readline = require('readline');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

dotenv.config();  // Load environment variables from .env file

const apiKey = process.env.STOCK_API_KEY;  // Retrieve the stock API key from environment
console.log('API Key loaded:', apiKey);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);  // Load Gemini API key

// New System Instruction as per your request
const systemInstruction = [
  {
    text: `*System Role:* You are an advanced stock market assistant trained to provide precise and up-to-date data about stock performance, financial metrics, and market trends. Your goal is to deliver factually correct answers to user queries with clarity and brevity.

*Prompt Details:* 
1. Gather accurate and real-time data from trusted financial APIs or databases.
2. Always prioritize user-specific queries (e.g., stock price, market cap, PE ratio, dividend yield, etc.).
3. Structure responses in a clear and concise format, using tables or bullet points for better readability.
4. Include relevant disclaimers about market volatility and the importance of research before investing.
5. Keep responses neutral and data-driven; avoid speculation or subjective opinions.
6. Provide definitions or context for financial terms when necessary to ensure user understanding.
7. For technical analysis, include visual aids (charts or graphs) if supported by your platform.
8. Always maintain a professional tone, and be polite and respectful in all interactions.
9. If you don't have the answer, politely inform the user and suggest they consult a financial advisor or do further research.
10.Use the latest data available from the API, and ensure that the information is relevant to the Indian stock market (NSE/BSE).
11.include a disclaimer about the simulated nature of the environment and the importance of verifying financial information from trusted sources.
12. If the user asks for top gainers, provide a list of the top 5 gainers in the Indian stock market with their respective percentage changes.
13. If the user asks for a specific stock, provide real-time data including price, daily high, daily low, market cap, P/E ratio, and volume.
14. If the user asks for a specific stock symbol, ensure to validate the symbol and provide relevant data.
15. Use the trusted financial API to fetch real-time data for stocks, ensuring accuracy and reliability.
16. Use the api that i have provided to fetch the data.
*Note:* This is a simulated environment, and the assistant's responses are generated based on the provided instructions. Always verify financial information from trusted sources before making investment decisions.
`
  }
];

const getStockData = async (symbol) => {
  try {
    const url = `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${apiKey}`;
    const response = await axios.get(url);

    if (response.data.length > 0) {
      const stockData = response.data[0];
      return {
        price: stockData.price,
        dayHigh: stockData.dayHigh,
        dayLow: stockData.dayLow,
        marketCap: stockData.marketCap,
        peRatio: stockData.pe,
        volume: stockData.volume
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching stock data:', error.message);
    return null;
  }
};

const getTopGainers = async () => {
  try {
    const url = `https://financialmodelingprep.com/api/v3/stock_market/gainers?apikey=${apiKey}`;
    const response = await axios.get(url);
    
    if (response.data.length > 0) {
      return response.data.map(stock => ({
        symbol: stock.symbol,
        companyName: stock.name,
        price: stock.price,
        changePercent: stock.changesPercentage
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching top gainers data:', error.message);
    return [];
  }
};

(async () => {
  // Set up the command-line interface for input/output
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Initialize the generative model for Gemini AI with the appropriate model
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Start a chat session with the system instruction
  const chat = model.startChat({
    history: [
      {
        role: 'user',
        parts: [{ text: systemInstruction[0].text }], // System message with initial instruction
      },
    ],
  });

  console.log("💬 Gemini Stock Bot (India) - Ask me about NSE/BSE stocks");

  rl.setPrompt("You: ");
  rl.prompt();

  // Handle user input in the command-line interface
  rl.on('line', async (input) => {
    if (input.toLowerCase() === 'exit') {
      console.log("👋 Exiting chat...");
      rl.close();
      return;
    }

    if (input.toLowerCase().includes('top gainers')) {
      const topGainers = await getTopGainers();

      if (topGainers.length > 0) {
        console.log("Here are the top gainers on the NSE:");
        console.table(topGainers);
      } else {
        console.log("Sorry, I couldn't retrieve the top gainers data right now.");
      }
    } else if (input.toLowerCase().includes('stock') || input.toLowerCase().includes('share')) {
      const stockSymbol = input.match(/[A-Za-z]{1,4}/); // Capture stock symbols like "ZOMATO"
      if (stockSymbol && stockSymbol[0]) {
        const stockData = await getStockData(stockSymbol[0].toUpperCase());

        if (stockData) {
          console.log(`Here’s the real-time data for ${stockSymbol[0]}:`);
          console.log(`
          * Price (₹): ${stockData.price}
          * Daily High (₹): ${stockData.dayHigh}
          * Daily Low (₹): ${stockData.dayLow}
          * Market Cap (₹ Cr): ${stockData.marketCap}
          * P/E Ratio: ${stockData.peRatio} (Price to Earnings ratio)
          * Volume: ${stockData.volume}
          `);
        } else {
          console.log(`Sorry, no data found for the stock symbol: ${stockSymbol[0]}`);
        }
      } else {
        console.log("Please provide a valid stock symbol.");
      }
    } else {
      try {
        // Send the user's input to the Gemini API and get the response
        const result = await chat.sendMessage(input);
        const response = result.response.text();  // Extract the response text
        console.log(`Bot: ${response}\n`);  // Display the response
      } catch (err) {
        console.error("❌ Error:", err.message);  // Handle any errors
      }
    }

    rl.prompt();
  });
})();
