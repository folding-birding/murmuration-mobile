export interface EntryMetadata {
  id: string
  guid: string
  createdAt: string
  updatedAt: string
}
export interface BirdColor { region: 'head' | 'body' | 'wing' | 'tail'; hex: string }
export interface Entry {
  metadata: EntryMetadata
  colors: BirdColor[]
  urls: { texture: string; audio: string; qr: string }
}
