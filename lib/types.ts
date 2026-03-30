export interface EtsyListing {
  title: string;
  tags: string[];
  description: string;
  category?: string;
  taxonomyId?: number;
}

export interface ListingImageMeta {
  id: string;
  rank: number;
  filename: string;
  url: string;
  width: number;
  height: number;
  prompt: string;
  createdAt: string;
}
