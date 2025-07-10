// Content Fetcher Service - RSS parsing for various news sources
// Production-safe implementation for Cloudflare Pages Functions

interface FeedItem {
  title: string
  description: string
  link: string
  pubDate: string
  source: string
  category: string
}

interface FeedResponse {
  items: FeedItem[]
  source: string
  error?: string
}

// RSS/API source configurations
const NEWS_SOURCES = {
  'world-news': {
    reuters: 'https://feeds.reuters.com/reuters/worldNews',
    google: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFZxYUdjU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en',
    reddit: 'https://www.reddit.com/r/worldnews/.rss?limit=25'
  },
  'sports': {
    espn: 'https://www.espn.com/espn/rss/news',
    reddit: 'https://www.reddit.com/r/sports/.rss?limit=25'
  },
  'crypto': {
    coingecko: 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false',
    reddit: 'https://www.reddit.com/r/CryptoCurrency/.rss?limit=25'
  },
  'technology': {
    reddit: 'https://www.reddit.com/r/technology/.rss?limit=25'
  },
  'weather': {
    openweather: 'weather-api' // Special marker for API-based source
  },
  'markets': {
    alphavantage: 'markets-api' // Special marker for API-based source
  }
}

// XML/RSS parser utility
export class RSSParser {
  private static parseXML(xmlString: string): Document | null {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(xmlString, 'application/xml')
      
      // Check for parsing errors
      const parserError = doc.querySelector('parsererror')
      if (parserError) {
        console.error('XML parsing error:', parserError.textContent)
        return null
      }
      
      return doc
    } catch (error) {
      console.error('XML parsing failed:', error)
      return null
    }
  }

  private static extractRSSItems(doc: Document, source: string): FeedItem[] {
    const items: FeedItem[] = []
    
    try {
      const itemElements = doc.querySelectorAll('item')
      
      itemElements.forEach((item, index) => {
        if (index >= 10) return // Limit to 10 items per source
        
        const title = item.querySelector('title')?.textContent?.trim() || 'Untitled'
        const description = item.querySelector('description')?.textContent?.trim() || ''
        const link = item.querySelector('link')?.textContent?.trim() || ''
        const pubDate = item.querySelector('pubDate')?.textContent?.trim() || new Date().toISOString()
        
        // Clean up description (remove HTML tags)
        const cleanDescription = description.replace(/<[^>]*>/g, '').trim()
        
        if (title && cleanDescription) {
          items.push({
            title,
            description: cleanDescription,
            link,
            pubDate,
            source,
            category: 'general'
          })
        }
      })
    } catch (error) {
      console.error(`Error parsing RSS items from ${source}:`, error)
    }
    
    return items
  }

  static async parseRSSFeed(url: string, source: string): Promise<FeedResponse> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'LoFi Radio Content Fetcher 1.0 (https://chillcast.fm)'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const xmlText = await response.text()
      const doc = this.parseXML(xmlText)
      
      if (!doc) {
        throw new Error('Failed to parse XML')
      }

      const items = this.extractRSSItems(doc, source)
      
      return {
        items,
        source
      }
    } catch (error) {
      console.error(`Error fetching RSS from ${source}:`, error)
      return {
        items: [],
        source,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

// CoinGecko API handler (JSON API, not RSS)
export class CoinGeckoAPI {
  static async fetchCryptoData(): Promise<FeedResponse> {
    try {
      const response = await fetch(NEWS_SOURCES.crypto.coingecko, {
        headers: {
          'User-Agent': 'LoFi Radio Content Fetcher 1.0 (https://chillcast.fm)'
        },
        signal: AbortSignal.timeout(10000)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const items: FeedItem[] = data.slice(0, 5).map((coin: any) => ({
        title: `${coin.name} (${coin.symbol.toUpperCase()}) Market Update`,
        description: `Current price: $${coin.current_price.toLocaleString()}, 24h change: ${coin.price_change_percentage_24h?.toFixed(2)}%`,
        link: `https://www.coingecko.com/en/coins/${coin.id}`,
        pubDate: new Date().toISOString(),
        source: 'CoinGecko',
        category: 'crypto'
      }))

      return {
        items,
        source: 'CoinGecko'
      }
    } catch (error) {
      console.error('Error fetching crypto data:', error)
      return {
        items: [],
        source: 'CoinGecko',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

// OpenWeatherMap API handler for weather data
export class OpenWeatherAPI {
  private static getApiKey(env?: any): string {
    // Try to get from environment (server-side)
    if (env && env.OPENWEATHER_API_KEY) {
      return env.OPENWEATHER_API_KEY
    }
    
    // Fallback to process environment
    return process.env.OPENWEATHER_API_KEY || ''
  }

  static async fetchWeatherData(env?: any): Promise<FeedResponse> {
    try {
      const apiKey = this.getApiKey(env)
      
      if (!apiKey) {
        return {
          items: [],
          source: 'OpenWeatherMap',
          error: 'OpenWeatherMap API key not configured'
        }
      }

      // Get weather for major cities
      const cities = [
        { name: 'New York', lat: 40.7128, lon: -74.0060 },
        { name: 'London', lat: 51.5074, lon: -0.1278 },
        { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
        { name: 'Sydney', lat: -33.8688, lon: 151.2093 }
      ]

      const weatherPromises = cities.map(async city => {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&appid=${apiKey}&units=metric`
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'LoFi Radio Content Fetcher 1.0 (https://chillcast.fm)'
          },
          signal: AbortSignal.timeout(10000)
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        
        return {
          title: `Weather Update: ${city.name}`,
          description: `Current conditions in ${city.name}: ${data.weather[0].description}, ${Math.round(data.main.temp)}°C, feels like ${Math.round(data.main.feels_like)}°C. Humidity: ${data.main.humidity}%, Wind: ${data.wind.speed} m/s`,
          link: `https://openweathermap.org/city/${data.id}`,
          pubDate: new Date().toISOString(),
          source: 'OpenWeatherMap',
          category: 'weather'
        }
      })

      const weatherData = await Promise.allSettled(weatherPromises)
      const items: FeedItem[] = weatherData
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<FeedItem>).value)

      return {
        items,
        source: 'OpenWeatherMap'
      }
    } catch (error) {
      console.error('Error fetching weather data:', error)
      return {
        items: [],
        source: 'OpenWeatherMap',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

// Alpha Vantage API handler for market data
export class AlphaVantageAPI {
  private static getApiKey(env?: any): string {
    // Try to get from environment (server-side)
    if (env && env.ALPHA_VANTAGE_API_KEY) {
      return env.ALPHA_VANTAGE_API_KEY
    }
    
    // Fallback to process environment
    return process.env.ALPHA_VANTAGE_API_KEY || ''
  }

  static async fetchMarketData(env?: any): Promise<FeedResponse> {
    try {
      const apiKey = this.getApiKey(env)
      
      if (!apiKey) {
        return {
          items: [],
          source: 'Alpha Vantage',
          error: 'Alpha Vantage API key not configured'
        }
      }

      // Get market data for major indices and stocks
      const symbols = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL']
      const marketPromises = symbols.map(async symbol => {
        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'LoFi Radio Content Fetcher 1.0 (https://chillcast.fm)'
          },
          signal: AbortSignal.timeout(10000)
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        const quote = data['Global Quote']
        
        if (!quote || !quote['01. symbol']) {
          throw new Error('Invalid response format')
        }

        const price = parseFloat(quote['05. price'])
        const change = parseFloat(quote['09. change'])
        const changePercent = parseFloat(quote['10. change percent'].replace('%', ''))
        
        return {
          title: `Market Update: ${quote['01. symbol']}`,
          description: `${quote['01. symbol']}: $${price.toFixed(2)} (${change >= 0 ? '+' : ''}${change.toFixed(2)}, ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%). Volume: ${parseInt(quote['06. volume']).toLocaleString()}`,
          link: `https://finance.yahoo.com/quote/${symbol}`,
          pubDate: new Date().toISOString(),
          source: 'Alpha Vantage',
          category: 'markets'
        }
      })

      const marketData = await Promise.allSettled(marketPromises)
      const items: FeedItem[] = marketData
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<FeedItem>).value)

      return {
        items,
        source: 'Alpha Vantage'
      }
    } catch (error) {
      console.error('Error fetching market data:', error)
      return {
        items: [],
        source: 'Alpha Vantage',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

// Main content fetcher service
export class ContentFetcher {
  private static async fetchFromSource(url: string, source: string, env?: any): Promise<FeedResponse> {
    if (source === 'CoinGecko') {
      return await CoinGeckoAPI.fetchCryptoData()
    } else if (source === 'openweather' || url === 'weather-api') {
      return await OpenWeatherAPI.fetchWeatherData(env)
    } else if (source === 'alphavantage' || url === 'markets-api') {
      return await AlphaVantageAPI.fetchMarketData(env)
    } else {
      return await RSSParser.parseRSSFeed(url, source)
    }
  }

  static async fetchAllContent(topics: string[] = ['world-news'], env?: any): Promise<Map<string, FeedItem[]>> {
    const results = new Map<string, FeedItem[]>()
    
    for (const topic of topics) {
      const sources = NEWS_SOURCES[topic as keyof typeof NEWS_SOURCES]
      if (!sources) continue
      
      const topicItems: FeedItem[] = []
      
      // Fetch from all sources for this topic in parallel
      const fetchPromises = Object.entries(sources).map(([sourceName, url]) => 
        this.fetchFromSource(url, sourceName, env)
      )
      
      const responses = await Promise.allSettled(fetchPromises)
      
      responses.forEach((response) => {
        if (response.status === 'fulfilled' && !response.value.error) {
          topicItems.push(...response.value.items)
        }
      })
      
      // Sort by publication date (newest first)
      topicItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      
      // Limit to 20 items per topic
      results.set(topic, topicItems.slice(0, 20))
    }
    
    return results
  }

  static async fetchForTopic(topic: string, env?: any): Promise<FeedItem[]> {
    const results = await this.fetchAllContent([topic], env)
    return results.get(topic) || []
  }
}

// Export types
export type { FeedItem, FeedResponse } 