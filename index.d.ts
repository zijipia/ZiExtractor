import {
  BaseExtractor,
  SearchQueryType,
  Track,
  GuildQueueHistory,
  ExtractorInfo,
  ExtractorSearchContext,
  ExtractorStreamable,
  QueryType,
  Playlist,
} from 'discord-player';
import { Readable } from 'stream';

interface ZiExtractorInit {
  createStream?: (info: Track) => Promise<Readable | string>;
}

declare class ZiExtractor extends BaseExtractor<ZiExtractorInit> {
  static identifier: string;
  static instance: ZiExtractor | null;
  protocols: string[];
  private _stream: (info: Track) => Promise<Readable | string>;

  constructor(options: ZiExtractorInit);

  activate(): Promise<void>;
  deactivate(): Promise<void>;
  validate(query: string, type?: SearchQueryType | null | undefined): boolean;
  handle(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo>;
  isYouTubeQuery(query: string): boolean;
  handleYouTubeQuery(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo>;
  handleNonYouTubeQuery(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo>;
  fallbackToYouTubeSearch(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo>;
  searchYouTube(query: string, options?: any): Promise<any[]>;
  handlePlaylist(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo>;
  handleVideo(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo>;
  getRelatedTracks(track: Track, history: GuildQueueHistory): Promise<ExtractorInfo>;
  stream(info: Track): Promise<ExtractorStreamable>;
  emptyResponse(): ExtractorInfo;
  createTrack(data: any, query: string, context: ExtractorSearchContext): Track;
  createYTTrack(video: any, context: ExtractorSearchContext, playlist?: Playlist | null): Track;
  private log(message: string): void;
}

export { ZiExtractor };
