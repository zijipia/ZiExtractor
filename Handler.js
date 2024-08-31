const { Playlist, Track, Util } = require('discord-player');
const YouTubeSR = require('youtube-sr');
const { YouTubeExtractor } = require('@discord-player/extractor');

async function searchYouTube(query, options = {}) {
  try {
    const results = await YouTubeSR.YouTube.search(query, {
      type: 'video',
      safeSearch: options.safeSearch,
      requestOptions: options,
    });
    if (!results || !results.length) {
    }
    return results || [];
  } catch (error) {
    return [];
  }
}

async function handlePlaylist(query, context, extractor) {
  try {
    extractor.context.player.debug(`[ZiExtractor] Fetching playlist for query: "${query}"`);
    const playlistData = await YouTubeSR.YouTube.getPlaylist(query, {
      fetchAll: true,
      limit: context.requestOptions?.limit,
      requestOptions: context.requestOptions,
    });

    if (!playlistData) {
      extractor.context.player.debug(`[ZiExtractor] No playlist data found for query: "${query}"`);
      return extractor.emptyResponse();
    }

    const playlist = new Playlist(extractor.context.player, {
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

    extractor.context.player.debug(
      `[ZiExtractor] Playlist "${playlist.title}" created with ${playlistData.videos.length} tracks.`
    );
    playlist.tracks = playlistData.videos.map(video => createTrack(video, context, extractor, playlist));

    return { playlist, tracks: playlist.tracks };
  } catch (error) {
    extractor.context.player.debug(`[ZiExtractor] Error in handlePlaylist: ${error.message}`);
    return extractor.emptyResponse();
  }
}

async function handleVideo(query, context, extractor) {
  try {
    extractor.context.player.debug(`[ZiExtractor] Handling video for query: "${query}"`);
    const videoId = query.match(/[a-zA-Z0-9-_]{11}/)?.[0];
    if (!videoId) {
      extractor.context.player.debug(`[ZiExtractor] Invalid video ID in query: "${query}"`);
      return extractor.emptyResponse();
    }

    const video = await YouTubeSR.YouTube.getVideo(
      `https://www.youtube.com/watch?v=${videoId}`,
      context.requestOptions
    );
    if (!video) {
      extractor.context.player.debug(`[ZiExtractor] No video found for ID: "${videoId}"`);
      return extractor.emptyResponse();
    }

    const track = createTrack(video, context, extractor);
    return { playlist: null, tracks: [track] };
  } catch (error) {
    extractor.context.player.debug(`[ZiExtractor] Error in handleVideo: ${error.message}`);
    return extractor.emptyResponse();
  }
}

async function RelatedTracks(track, history, extractor) {
  try {
    extractor.context.player.debug(`[ZiExtractor] Fetching related tracks for track: "${track.title}"`);
    const relatedVideos = await fetchRelatedVideos(track, extractor);
    if (!relatedVideos.length) {
      extractor.context.player.debug(`[ZiExtractor] No related videos found for track: "${track.title}"`);
      return [];
    }

    const uniqueTracks = filterUniqueTracks(relatedVideos, history);
    extractor.context.player.debug(
      `[ZiExtractor] Found ${uniqueTracks.length} unique related tracks for track: "${track.title}"`
    );
    return uniqueTracks.map(video => createTrack(video, { requestedBy: track.requestedBy }, extractor));
  } catch (error) {
    extractor.context.player.debug(`[ZiExtractor] Error in RelatedTracks: ${error.message}`);
    return [];
  }
}

function createTrack(video, context, extractor, playlist = null) {
  extractor.context.player.debug(`[ZiExtractor] Video: "${video?.title.slice(0, 70)}..."`);
  return new Track(extractor.context.player, {
    title: video.title,
    description: video.description,
    author: video.channel?.name,
    url: video.url,
    requestedBy: context.requestedBy,
    thumbnail: video.thumbnail?.displayThumbnailURL('maxresdefault') || video.thumbnail.url,
    views: video.views,
    duration: video?.durationFormatted || Util.buildTimeCode(Util.parseMS(video.duration * 1e3)),
    source: 'youtube',
    raw: video,
    queryType: 'youtubeVideo',
    metadata: video,
    playlist,
    async requestMetadata() {
      return video;
    },
  });
}

async function fetchRelatedVideos(track, extractor) {
  try {
    const { player } = extractor.context;
    let result = [];

    if (YouTubeExtractor.validateURL(track.url)) {
      player.debug(`[ZiExtractor] Fetching related videos for URL: "${track.url}"`);
      const video = await YouTubeSR.YouTube.getVideo(track.url);
      result = video?.videos || [];
    } else {
      const searchQuery = track.author && track.author !== 'Unknown' ? track.author : track.title;
      player.debug(`[ZiExtractor] Searching related videos for: "${searchQuery}"`);
      result = await YouTubeSR.YouTube.search(searchQuery, { limit: 25, type: 'video' });
    }

    return result;
  } catch (error) {
    extractor.context.player.debug(`[ZiExtractor] Error in fetchRelatedVideos: ${error.message}`);
    return [];
  }
}

function filterUniqueTracks(videos, history) {
  return videos.filter(video => !history.tracks.some(track => track.url === video.url));
}

module.exports = { handlePlaylist, handleVideo, searchYouTube, RelatedTracks };
