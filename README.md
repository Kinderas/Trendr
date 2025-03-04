# Trendr.

AI-Powered Meme Coin Trading Bot.

![Trendr-Home](./client/public/trendr-website-design/)

## ⚠️ Problem to Solve.

The meme coin market moves at an extremely fast pace, with trends emerging and fading within hours. Retail traders often miss out on high-profit opportunities because they lack real-time data, sentiment analysis and automated execution.

There’s a need for a tool that allows users to capitalize on the latest crypto trends by automating trades based on influencer tweets, engagement metrics and AI-driven sentiment analysis.

## ✅ Possible Solution.

**Trendr** is an AI-powered meme coin trading bot that fetches and analyzes influencer tweets in real time, making automated trade decisions based on sentiment and engagement metrics. It helps users stay ahead of viral trends with:

1. **Real-time Tweet Scraping**: Monitors top crypto influencers and meme coin discussions to detect potential trends.

2. **AI-Based Sentiment Analysis**: Uses machine learning to evaluate tweets and gauge market sentiment.

3. **Automated Trading Execution**: Executes buy/sell orders based on sentiment thresholds and engagement metrics.

4. **Engagement Metrics Analysis**: Considers likes, retweets, and comments to predict market movements.

5. **Risk Management Controls**: Customizable stop-loss and take-profit settings to minimize risk.

6. **Solana Blockchain Integration**: Executes trades on Solana-based decentralized exchanges (DEXs) for fast and low-cost transactions.

7. **User Dashboard**: Provides an intuitive UI for tracking trades, profits, and overall market trends.

## ⚙️ Architecture.

![Working Architecture](./)
[Excalidaw File...](./)

## 🛠 Tools, Languages & Frameworks used.

- **ReactJS**: Frontend library for building interactive user interfaces.
- **Node.js**: Backend runtime environment for server-side JavaScript.
- **Express.js**: Web framework for building RESTful APIs on Node.js.
- **@Solana/Web3.js**: For blockchain interactions and trading execution.
- **Rust**: Smart contract development for Solana-based execution.
- **OpenAI GPT**: Large language model for sentiment analysis.
- **Twitter API**: Fetches influencer tweets for trend detection.
- **IPFS/MongoDB/PostgreSQL**: Database for storing trade history and market insights.

## 📂 Folder Structure.

* **client**: Contains the frontend codebase.
* **server**: Contains backend code and smart contract templates.

## 🧑‍💻 Contributions to this repo are WELCOME.👋

* 🎨 Any improvements to the design and UI are welcome.
* 🔨 Try to break the website by testing it to find any bugs. If you find any, check if there is an issue already open for it, if there is none, then report it.

## 🔃 Steps to be followed in order to make valid contributions to this repo.

**1.** Fork the [Trendr](https://github.com/mrinnnmoy/Trendr) repo by clicking on the fork button on the top of the page. This will create a copy of this repository in your account.

**2.** Clone the forked repository

        git clone "https://github.com/<your-github-username>/Trendr"

* Download and install Node JS v16.16.0
* Download and install Git.
* Go to the terminal of your code editor and run "npm install" to download packages.
* Run "npm run dev" to start a local server.

**3.** Make necessary changes and commit those changes. <br />
Remember never push anything to the Main branch. <br />

Always change your branch to "develop" using:

    git checkout develop

Again check your current branch using:

    git branch

It should point \*develop

Now add your changes using:

    git add files-you-edited

If there are multiple files you can use:

    git add .

Now create a commit message using:

    git commit -m "<commit-message-goes-here>"

**4.** Push changes to GitHub

    git push origin develop

**5.** Create a Pull Request 👋<br>

Now you go to your repository on GitHub, you’ll see a `Compare & pull request` button. Click on that button and now write a summary of what changes you have done. (Attach images if required). I will review your code and merge it if it passes all the tests.❤️
