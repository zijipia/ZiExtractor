const { BaseExtractor, QueryType, Track, Playlist } = require('discord-player');
const { unfurl } = require('unfurl.js');
const YouTubeSR = require('youtube-sr');
const ytdl = require('@distube/ytdl-core');

async function getStream(query, extractor) {
  if (query.source == 'youtube') {
    extractor.log(`use [distube] getInfo: ${query.url}`);
    const info = await ytdl.getInfo(query.url);

    const formats = info.formats
      .filter(
        format =>
          format.hasAudio &&
          format.url.includes('c=IOS') &&
          !format.url.includes('c=ANDROID') &&
          !format.url.includes('c=WEB') &&
          (!info.videoDetails.isLiveContent || format.isHLS)
      )
      .sort((a, b) => Number(b.audioBitrate) - Number(a.audioBitrate));

    const fmt = formats.find(format => !format.hasVideo) || formats[0];
    const url = fmt?.url;
    extractor.log(`success use [distube] get Stream source: ${url}`);
    if (url) return url;
  }
  extractor.log(`use [cobalt] getStream: ${query.url}`);
  try {
    const response = await fetch('https://api.cobalt.tools/api/json', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ url: query.url, isAudioOnly: true }),
    });
    const data = await response.json();
    extractor.log(`use [cobalt] response: ${data}`);
    return data.url;
  } catch (error) {
    extractor.log(`Error in getStream: ${error.message}`);
    console.error(`Error in getStream: ${error.message}`);
    return null;
  }
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}
function isYouTubeQuery(query) {
  if (['youtube', 'youtu.be'].some(domain => query.includes(domain))) {
    return true;
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(query)) {
    return true;
  }

  return query.length > 0;
}
class ZiExtractor extends BaseExtractor {
  static identifier = 'com.Ziji.discord-player.Zijiext';
  static instance;

  protocols = [
    'https',
    'bilibili',
    'dailymotion',
    'facebook',
    'instagram',
    'loom',
    'ok',
    'pinterest',
    'reddit',
    'rutube',
    'snapchat',
    'soundcloud',
    'streamable',
    'tiktok',
    'tumblr',
    'twitch',
    'twitter',
    'vine',
    'vimeo',
    'vk',
    'youtube',
  ];

  constructor(options) {
    super(options);
    this._stream = options.createStream || getStream;
  }

  async activate() {
    ZiExtractor.instance = this;
  }

  async deactivate() {
    this.log('Deactivating ZiExtractor');
    this.protocols = [];
    ZiExtractor.instance = null;
  }

  validate(query, type) {
    this.log(`Validating query: ${query} with type: ${type}`);
    return (
      typeof query === 'string' &&
      [
        QueryType.AUTO,
        QueryType.AUTO_SEARCH,
        QueryType.YOUTUBE,
        QueryType.YOUTUBE_SEARCH,
        QueryType.YOUTUBE_PLAYLIST,
        QueryType.YOUTUBE_VIDEO,
        QueryType.ARBITRARY,
      ].includes(type)
    );
  }

  async handle(query, context) {
    this.log(`Handling query: ${query}`);
    try {
      if (context.protocol === 'https') query = `https:${query}`;

      if (isYouTubeQuery(query)) {
        query = query.replace(/(m(usic)?|gaming)\./, '');
        return await this.handleYouTubeQuery(query, context);
      }

      if (isValidUrl(query)) {
        return await this.handleNonYouTubeQuery(query, context);
      }

      return await this.fallbackToYouTubeSearch(query, context);
    } catch (error) {
      this.log(`Error handling query: ${error.message}`);
      return await this.fallbackToYouTubeSearch(query, context);
    }
  }

  async handleYouTubeQuery(query, context) {
    if (context.type === QueryType.YOUTUBE_PLAYLIST || query.includes('list=')) {
      this.log(`Handling YouTube playlist: ${query}`);
      return this.handlePlaylist(query, context);
    }

    if (
      [QueryType.YOUTUBE_VIDEO, QueryType.YOUTUBE_SEARCH].includes(context.type) ||
      YouTubeSR.YouTube.validate(query, 'VIDEO')
    ) {
      this.log(`Handling YouTube video: ${query}`);
      return this.handleVideo(query, context);
    }

    return await this.fallbackToYouTubeSearch(query, context);
  }

  async handleNonYouTubeQuery(query, context) {
    this.log(`Handling non-YouTube query: ${query}`);
    const data = await unfurl(query, { timeout: 1500 });
    const track = this.createTrack(data, query, context);
    return { playlist: null, tracks: [track] };
  }

  async fallbackToYouTubeSearch(query, context) {
    this.log(`Falling back to YouTube search for query: ${query}`);
    const tracks = await this.searchYouTube(query, context);
    return tracks.length ? { playlist: null, tracks } : this.emptyResponse();
  }

  async searchYouTube(query, context = {}) {
    try {
      const results = await YouTubeSR.YouTube.search(query, {
        type: 'video',
        safeSearch: context.requestOptions?.safeSearch,
        requestOptions: context.requestOptions,
      });

      if (!results || !results.length) {
        return [];
      }

      return results.map(video => this.createYTTrack(video, context));
    } catch (error) {
      this.log(`Error in searchYouTube: ${error.message}`);
      return [];
    }
  }

  async handlePlaylist(query, context) {
    this.log(`Fetching playlist for query: "${query}"`);
    try {
      const playlistData = await YouTubeSR.YouTube.getPlaylist(query, {
        fetchAll: true,
        limit: context.requestOptions?.limit,
        requestOptions: context.requestOptions,
      });

      if (!playlistData) {
        this.log(`No playlist data found for query: "${query}"`);
        return this.handleVideo(query, context);
      }

      const playlist = new Playlist(this.context.player, {
        title: playlistData.title,
        thumbnail: playlistData.thumbnail?.displayThumbnailURL('maxresdefault'),
        description: playlistData.title || '',
        type: 'playlist',
        source: 'youtube',
        author: {
          name: playlistData.channel.name,
          url: playlistData.channel.url,
        },
        id: playlistData.id,
        url: playlistData.url,
        rawPlaylist: playlistData,
      });

      this.log(`Playlist "${playlist.title}" created with ${playlistData.videos.length} tracks.`);
      playlist.tracks = playlistData.videos.map(video => this.createYTTrack(video, context, playlist));

      return { playlist, tracks: playlist.tracks };
    } catch (error) {
      this.log(`Error in handlePlaylist: ${error.message}`);
      return this.emptyResponse();
    }
  }

  async handleVideo(query, context) {
    this.log(`Handling video for query: "${query}"`);
    try {
      const videoId = query.match(/[a-zA-Z0-9-_]{11}/)?.[0];
      if (!videoId) {
        this.log(`Invalid video ID in query: "${query}"`);
        return this.emptyResponse();
      }

      const video = await YouTubeSR.YouTube.searchOne(
        `https://www.youtube.com/watch?v=${videoId}`,
        'video',
        null,
        context.requestOptions
      );

      if (!video) {
        this.log(`No video found for ID: "${videoId}"`);
        return this.emptyResponse();
      }

      const track = this.createYTTrack(video, context);
      return { playlist: null, tracks: [track] };
    } catch (error) {
      this.log(`Error in handleVideo: ${error.message}`);
      return this.emptyResponse();
    }
  }

  async getRelatedTracks(track, history) {
    this.log(`Fetching related tracks for: ${track.url}`);
    try {
      let result = [];
      if (YouTubeSR.YouTube.validate(track.url, 'VIDEO')) {
        this.log(`Fetching related videos for URL: "${track.url}"`);
        const video = await YouTubeSR.YouTube.getVideo(track.url);
        result = video?.videos || [];
      } else {
        const searchQuery = track.author && track.author !== 'Unknown' ? track.author : track.title;
        this.log(`Searching related videos for: "${searchQuery}"`);
        result = await YouTubeSR.YouTube.search(searchQuery, { limit: 25, type: 'video' });
      }
      const uniqueTracks = result.filter(video => !history.tracks.some(track => track.url === video.url));
      this.log(`Found ${uniqueTracks.length} unique related tracks for track: "${track?.title}"`);

      const tracks = uniqueTracks.map(video => this.createYTTrack(video, { requestedBy: track.requestedBy }));
      return { playlist: null, tracks };
    } catch (error) {
      this.log(`Error in fetchRelatedVideos: ${error.message}`);
      return this.emptyResponse();
    }
  }

  stream(info) {
    this.log(`Streaming info for: ${info.url}`);
    return this._stream(info, this);
  }

  emptyResponse() {
    this.log('Returning empty response');
    return { playlist: null, tracks: [] };
  }

  createTrack(data, query, context) {
    this.log(`Creating track for query: ${query}`);
    const { twitter_card, title, open_graph, author, description, oEmbed } = data ?? {};

    const getFirstValue = (...args) => args.find(arg => arg != null) ?? 'Unknown';

    return new Track(this.context.player, {
      title: getFirstValue(twitter_card?.title, title, open_graph?.title),
      author: getFirstValue(author, open_graph?.article?.author, oEmbed?.author_name),
      description: getFirstValue(description, open_graph?.description, twitter_card?.description),
      url: query,
      requestedBy: context?.requestedBy,
      thumbnail: getFirstValue(
        open_graph?.images?.[0]?.url,
        oEmbed?.thumbnails?.[0]?.url,
        twitter_card?.images?.[0]?.url,
        'https://raw.githubusercontent.com/zijipia/zijipia/main/Assets/image.png'
      ),
      source: getFirstValue(open_graph?.site_name, oEmbed?.provider_name, twitter_card?.site, 'ZiExt'),
      raw: data,
      queryType: context.type,
      metadata: data,
      async requestMetadata() {
        return data;
      },
    });
  }

  createYTTrack(video, context, playlist = null) {
    this.log(`Video: "${video?.title?.slice(0, 70)}..."`);
    return new Track(this.context.player, {
      title: video?.title || 'Unknown Title',
      description: video?.description,
      author: video?.channel?.name,
      url: video?.url,
      requestedBy: context?.requestedBy,
      thumbnail: video.thumbnail?.displayThumbnailURL?.('maxresdefault') || video.thumbnail.url || video.thumbnail,
      views: video?.views,
      duration: video?.durationFormatted || Util.buildTimeCode(Util.parseMS(video.duration * 1e3)),
      source: 'youtube',
      raw: video,
      queryType: 'youtubeVideo',
      metadata: video,
      playlist,
      async requestMetadata() {
        return video;
      },
      live: video?.live,
    });
  }

  log(message) {
    this.context.player.debug(`[ZiExtractor] ${message}`);
  }
}

module.exports = { ZiExtractor };
