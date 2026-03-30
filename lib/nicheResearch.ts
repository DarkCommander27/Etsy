export interface TopListing {
  id: number;
  title: string;
  price: string;
  favorers: number;
  url: string;
}

export interface NicheResearchResult {
  keyword: string;
  totalListings: number;
  avgFavorers: number;
  avgPrice: number;
  topListings: TopListing[];
  opportunityScore: number;
  competitionLevel: 'low' | 'medium' | 'high';
  demandLevel: 'low' | 'medium' | 'high';
}