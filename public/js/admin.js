const deleteBtn = document.querySelectorAll('.delete__btn');

const deleteProduct = async () => {
  await Promise.all(
    [...deleteBtn].map(async btn => {
      await btn.addEventListener('click', async e => {
        const productId =
          e.target.parentNode.querySelector('[name=productId]').value;
        const csrf = e.target.parentNode.querySelector('[name=_csrf]').value;

        try {
          const res = await fetch(`/admin/products/${productId}`, {
            method: 'DELETE',
            headers: {
              'csrf-token': csrf,
            },
          });

          if (res.status === 202) {
            btn.closest('article').remove();
          }
        } catch (error) {
          console.log(error);
        }
      });
    })
  );
};

deleteProduct();
