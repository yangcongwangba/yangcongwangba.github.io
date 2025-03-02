from django.core.management import call_command
from django_distill import distill_app

# 配置Django项目
# ...

# 定义需要生成的静态页面
def get_index():
    return None

def get_posts():
    # 获取所有博客文章
    return Post.objects.all()

# 配置静态生成规则
urlpatterns = [
    distill_url(r'^$', views.home, name='home', distill_func=get_index),
    distill_url(r'^posts/(?P<slug>[\w-]+)/$', views.post_detail, name='post_detail', distill_func=get_posts),
    # 其他页面...
]

# 运行静态生成
call_command('distill-local', '--force') 