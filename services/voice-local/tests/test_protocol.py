from voice_gateway import protocol


def test_ready_message_shape() -> None:
    payload = protocol.ready_message()
    assert '"type":"ready"' in payload.replace(" ", "")


def test_agent_state_message() -> None:
    payload = protocol.agent_state("listening")
    assert "listening" in payload
