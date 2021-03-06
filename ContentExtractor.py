from sklearn.externals import joblib
from sklearn.svm import SVC


class ContentExtractor:
    def __init__(self, mode):
        self.mode = mode
        if mode == 1:
            self.classifier_path = "model\svm_news.pkl"
            self.classifier_title_path = "model\svm_news_title.pkl"
            self.sc_path = "model\sc_news.pkl"
            self.sc_title_path = "model\sc_news_title.pkl"
        elif mode == 2:
            self.classifier_path = "model\svm_blog.pkl"
            self.classifier_title_path = "model\svm_blog_title.pkl"
            self.sc_path = "model\sc_blog.pkl"
            self.sc_title_path = "model\sc_blog_title.pkl"
        elif mode == 3:
            self.classifier_path = "model\svm_shop.pkl"
            self.classifier_title_path = "model\svm_shop_title.pkl"
            self.sc_path = "model\sc_shop.pkl"
            self.sc_title_path = "model\sc_shop_title.pkl"

        try:
            self.classifier = joblib.load(self.classifier_path)
            self.classifier_title = joblib.load(self.classifier_title_path)
            self.sc = joblib.load(self.sc_path)
            self.sc_title = joblib.load(self.sc_title_path)
        except:
            print("!!!\n\tNo learned model\n!!!")

    def setblocklist(self, blocklist):
        self.BlockList = blocklist

    def extractcontent(self):
        self.inputs = []
        self.title_inputs = []
        self.contents = []
        for block in self.BlockList:
            x = [block.x, block.y, block.w, block.h, block.fontsize]
            self.inputs.append(x)
        self.pred = self.classifier.predict(self.sc.transform(self.inputs))

        for index in range(len(self.BlockList)):
            block = self.BlockList[index]
            if self.pred[index] == 1:
                x = [block.x, block.y, block.w, block.h, block.fontsize]
                self.title_inputs.append(x)
                self.contents.append([block.type, block.content])
        self.pred_title = self.classifier_title.predict(self.sc_title.transform(self.title_inputs))
        self.title = []
        self.image = []
        self.text = []
        for index in range(len(self.contents)):
            content = self.contents[index]
            if self.pred_title[index] == 1:
                self.title.append(content[1])
            elif content[0] == "text":
                self.text.append(content[1])
            elif content[0] == "img":
                self.image.append(content[1])
        return self.title, self.text, self.image
