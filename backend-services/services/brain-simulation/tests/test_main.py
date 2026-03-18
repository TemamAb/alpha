import pytest
from unittest.mock import patch, MagicMock
from src.main import app, get_db_connection, get_redis_connection

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@patch('src.main.get_db_connection')
@patch('src.main.get_redis_connection')
def test_simulate_route(mock_redis, mock_db, client):
    # Mock the connections
    mock_db.return_value = MagicMock()
    mock_redis.return_value = MagicMock()

    response = client.get('/simulate')
    assert response.status_code == 200
    data = response.get_json()
    assert 'scenario' in data
    assert 'outcome' in data
    assert 'pnl' in data
    assert 'confidence' in data
    assert data['scenario'] == 'Market Crash'
    assert data['outcome'] in ['Profit', 'Loss', 'Break Even']
    assert -1000 <= data['pnl'] <= 1000
    assert 0.5 <= data['confidence'] <= 0.95

def test_health_route(client):
    response = client.get('/health')
    assert response.status_code == 200
    data = response.get_json()
    assert data == {'status': 'ok'}

@patch('src.main.psycopg2.connect')
@patch.dict('os.environ', {'DATABASE_URL': 'test_db_url'})
def test_get_db_connection(mock_connect):
    # Reset global
    import src.main
    src.main.db_conn = None
    mock_conn = MagicMock()
    mock_connect.return_value = mock_conn

    conn = get_db_connection()
    assert conn == mock_conn
    mock_connect.assert_called_once_with('test_db_url')

    # Call again, should return cached
    conn2 = get_db_connection()
    assert conn2 == mock_conn
    assert mock_connect.call_count == 1

@patch('src.main.redis.from_url')
@patch.dict('os.environ', {'REDIS_URL': 'test_redis_url'})
def test_get_redis_connection(mock_from_url):
    # Reset global
    import src.main
    src.main.redis_conn = None
    mock_conn = MagicMock()
    mock_from_url.return_value = mock_conn

    conn = get_redis_connection()
    assert conn == mock_conn
    mock_from_url.assert_called_once_with('test_redis_url')

    # Call again, should return cached
    conn2 = get_redis_connection()
    assert conn2 == mock_conn
    assert mock_from_url.call_count == 1