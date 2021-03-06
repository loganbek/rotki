from typing import Any, Dict, List, Optional

from rotkehlchen.assets.asset import Asset
from rotkehlchen.db.dbhandler import DBHandler
from rotkehlchen.db.settings import ModifiableDBSettings
from rotkehlchen.db.utils import BlockchainAccounts
from rotkehlchen.tests.utils.constants import DEFAULT_TESTS_MAIN_CURRENCY
from rotkehlchen.typing import (
    ApiKey,
    BlockchainAccountData,
    ExternalService,
    ExternalServiceApiCredentials,
    SupportedBlockchain,
)


def maybe_include_etherscan_key(db: DBHandler, include_etherscan_key: bool) -> None:
    if not include_etherscan_key:
        return
    # Add the tests only etherscan API key
    db.add_external_service_credentials([ExternalServiceApiCredentials(
        service=ExternalService.ETHERSCAN,
        api_key=ApiKey('8JT7WQBB2VQP5C3416Y8X3S8GBA3CVZKP4'),
    )])


def add_blockchain_accounts_to_db(db: DBHandler, blockchain_accounts: BlockchainAccounts) -> None:
    db.add_blockchain_accounts(
        SupportedBlockchain.ETHEREUM,
        [BlockchainAccountData(address=x) for x in blockchain_accounts.eth],
    )
    db.add_blockchain_accounts(
        SupportedBlockchain.BITCOIN,
        [BlockchainAccountData(address=x) for x in blockchain_accounts.btc],
    )


def add_settings_to_test_db(
        db: DBHandler,
        db_settings: Optional[Dict[str, Any]],
        ignored_assets: Optional[List[Asset]],
) -> None:
    settings = {
        # DO not submit usage analytics during tests
        'submit_usage_analytics': False,
        'main_currency': DEFAULT_TESTS_MAIN_CURRENCY,
    }
    # Set the given db_settings. The pre-set values have priority unless overriden here
    if db_settings is not None:
        for key, value in db_settings.items():
            settings[key] = value
    db.set_settings(ModifiableDBSettings(**settings))  # type: ignore

    if ignored_assets:
        for asset in ignored_assets:
            db.add_to_ignored_assets(asset)
