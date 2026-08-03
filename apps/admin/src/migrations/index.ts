import * as migration_20260709_181730 from './20260709_181730';
import * as migration_20260713_142511_sites from './20260713_142511_sites';
import * as migration_20260713_174436_domains from './20260713_174436_domains';
import * as migration_20260716_124305_pages from './20260716_124305_pages';
import * as migration_20260716_172340_pages_institutional from './20260716_172340_pages_institutional';
import * as migration_20260717_160602_blog_collections from './20260717_160602_blog_collections';
import * as migration_20260717_180310_companies_strategic_pages from './20260717_180310_companies_strategic_pages';
import * as migration_20260717_194500_users_rbac from './20260717_194500_users_rbac';
import * as migration_20260720_120000_identity_crm_foundation from './20260720_120000_identity_crm_foundation';
import * as migration_20260720_180000_lead_capture_activity from './20260720_180000_lead_capture_activity';
import * as migration_20260720_190000_crm_companies_texts from './20260720_190000_crm_companies_texts';
import * as migration_20260720_191000_locked_documents_crm_rels from './20260720_191000_locked_documents_crm_rels';
import * as migration_20260724_120000_partner_network from './20260724_120000_partner_network';
import * as migration_20260724_180000_partner_geocoding_meta from './20260724_180000_partner_geocoding_meta';
import * as migration_20260731_160000_lms_connector_foundation from './20260731_160000_lms_connector_foundation';
import * as migration_20260803_180000_neurofrigo_knowledge_hub from './20260803_180000_neurofrigo_knowledge_hub';

export const migrations = [
  {
    up: migration_20260709_181730.up,
    down: migration_20260709_181730.down,
    name: '20260709_181730',
  },
  {
    up: migration_20260713_142511_sites.up,
    down: migration_20260713_142511_sites.down,
    name: '20260713_142511_sites',
  },
  {
    up: migration_20260713_174436_domains.up,
    down: migration_20260713_174436_domains.down,
    name: '20260713_174436_domains',
  },
  {
    up: migration_20260716_124305_pages.up,
    down: migration_20260716_124305_pages.down,
    name: '20260716_124305_pages',
  },
  {
    up: migration_20260716_172340_pages_institutional.up,
    down: migration_20260716_172340_pages_institutional.down,
    name: '20260716_172340_pages_institutional',
  },
  {
    up: migration_20260717_160602_blog_collections.up,
    down: migration_20260717_160602_blog_collections.down,
    name: '20260717_160602_blog_collections',
  },
  {
    up: migration_20260717_180310_companies_strategic_pages.up,
    down: migration_20260717_180310_companies_strategic_pages.down,
    name: '20260717_180310_companies_strategic_pages',
  },
  {
    up: migration_20260717_194500_users_rbac.up,
    down: migration_20260717_194500_users_rbac.down,
    name: '20260717_194500_users_rbac',
  },
  {
    up: migration_20260720_120000_identity_crm_foundation.up,
    down: migration_20260720_120000_identity_crm_foundation.down,
    name: '20260720_120000_identity_crm_foundation',
  },
  {
    up: migration_20260720_180000_lead_capture_activity.up,
    down: migration_20260720_180000_lead_capture_activity.down,
    name: '20260720_180000_lead_capture_activity',
  },
  {
    up: migration_20260720_190000_crm_companies_texts.up,
    down: migration_20260720_190000_crm_companies_texts.down,
    name: '20260720_190000_crm_companies_texts',
  },
  {
    up: migration_20260720_191000_locked_documents_crm_rels.up,
    down: migration_20260720_191000_locked_documents_crm_rels.down,
    name: '20260720_191000_locked_documents_crm_rels',
  },
  {
    up: migration_20260724_120000_partner_network.up,
    down: migration_20260724_120000_partner_network.down,
    name: '20260724_120000_partner_network',
  },
  {
    up: migration_20260724_180000_partner_geocoding_meta.up,
    down: migration_20260724_180000_partner_geocoding_meta.down,
    name: '20260724_180000_partner_geocoding_meta',
  },
  {
    up: migration_20260731_160000_lms_connector_foundation.up,
    down: migration_20260731_160000_lms_connector_foundation.down,
    name: '20260731_160000_lms_connector_foundation',
  },
  {
    up: migration_20260803_180000_neurofrigo_knowledge_hub.up,
    down: migration_20260803_180000_neurofrigo_knowledge_hub.down,
    name: '20260803_180000_neurofrigo_knowledge_hub',
  },
];
