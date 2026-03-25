import sys
import os
sys.path.append(os.getcwd())
from app.core.vector_store import get_vector_store
from app.core.embedder import get_embed_model
from llama_index.core import VectorStoreIndex
import logging

logging.basicConfig(level=logging.INFO)

def test():
    print('Getting vector store...')
    vs = get_vector_store('data_talk_doc_vectors')
    print('Getting embed model...')
    embed_model = get_embed_model()
    print('Creating index...')
    idx = VectorStoreIndex.from_vector_store(vs, embed_model=embed_model)
    retriever = idx.as_retriever(similarity_top_k=5)
    print('Retrieving...')
    nodes = retriever.retrieve('What is in the document?')
    print(f'\n--- Found {len(nodes)} nodes ---')
    for i, n in enumerate(nodes):
        print(f'\nNode {i} (score: {n.score}):')
        print(n.node.get_text()[:300])

if __name__ == '__main__':
    test()
